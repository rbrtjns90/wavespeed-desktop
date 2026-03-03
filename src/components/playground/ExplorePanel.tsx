import { useState, useMemo, useCallback, useRef, memo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import { useModelsStore } from "@/stores/modelsStore";
import { usePlaygroundStore } from "@/stores/playgroundStore";
import { fuzzySearch } from "@/lib/fuzzySearch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  PlayCircle,
  ExternalLink,
  Star,
  Info,
  Search,
  X,
  ArrowDownNarrowWide,
  ArrowUpNarrowWide,
  ChevronDown,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useVirtualizer } from "@tanstack/react-virtual";

type SortKey = "popularity" | "name" | "price";

/** Get the meaningful model name (second path segment). e.g. "wavespeed-ai/ai-kissing" → "ai-kissing" */
function getModelShortName(modelId: string): string {
  const parts = modelId.split("/");
  return parts[1] || parts[0];
}

/** Format slug to title case. e.g. "ai-kissing" → "Ai Kissing" */
function formatSlug(s: string): string {
  return s
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Color mapping for model type tags */
function getTypeColor(type: string): string {
  const t = type.toLowerCase();
  if (t.includes("video"))
    return "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400";
  if (t.includes("image"))
    return "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400";
  if (t.includes("audio"))
    return "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400";
  if (t.includes("portrait"))
    return "bg-pink-100 text-pink-700 dark:bg-pink-500/15 dark:text-pink-400";
  if (t.includes("text"))
    return "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400";
  return "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400";
}

interface ExplorePanelProps {
  onSelectModel: (modelId: string) => void;
  externalSearch?: string;
}

/** Memoized model card to avoid re-rendering all cards on filter change */
const ModelCard = memo(function ModelCard({
  model,
  isFav,
  onSelect,
  onToggleFav,
  onNewTab,
}: {
  model: {
    model_id: string;
    name: string;
    type?: string;
    base_price?: number;
    description?: string;
  };
  isFav: boolean;
  onSelect: (id: string) => void;
  onToggleFav: (e: React.MouseEvent, id: string) => void;
  onNewTab: (e: React.MouseEvent, id: string) => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      onClick={() => onSelect(model.model_id)}
      className="cursor-pointer rounded-lg border border-border bg-card shadow-sm hover:bg-accent/50 hover:border-primary/30 hover:shadow-md transition-all group overflow-hidden dark:bg-white/[0.06] dark:border-white/[0.08] dark:hover:bg-white/[0.10]"
    >
      <div className={cn("h-[2px]", getTypeColor(model.type || ""))} />
      <div className="p-2.5">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors flex-1 min-w-0">
            {model.name}
          </p>
          {model.type && (
            <span
              className={cn(
                "text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 whitespace-nowrap",
                getTypeColor(model.type),
              )}
            >
              {model.type}
            </span>
          )}
        </div>
        <div className="flex items-center justify-between">
          {model.base_price !== undefined && (
            <span className="text-xs font-semibold text-primary">
              ${model.base_price.toFixed(4)}
            </span>
          )}
          <div className="flex gap-0.5 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
            <HoverCard openDelay={200} closeDelay={100}>
              <HoverCardTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 w-6 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Info className="h-3 w-3" />
                </Button>
              </HoverCardTrigger>
              <HoverCardContent className="w-64" side="top" align="end">
                <div className="space-y-1.5">
                  <h4 className="font-semibold text-sm">{model.name}</h4>
                  <p className="text-xs text-muted-foreground font-mono break-all">
                    {model.model_id}
                  </p>
                  {model.description && (
                    <p className="text-xs text-muted-foreground">
                      {model.description}
                    </p>
                  )}
                  {model.type && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {t("models.type")}:
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {model.type}
                      </Badge>
                    </div>
                  )}
                  {model.base_price !== undefined && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-muted-foreground">
                        {t("models.basePrice")}:
                      </span>
                      <span className="font-medium text-primary">
                        ${model.base_price.toFixed(4)}
                      </span>
                    </div>
                  )}
                </div>
              </HoverCardContent>
            </HoverCard>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => onToggleFav(e, model.model_id)}
            >
              <Star
                className={cn(
                  "h-3 w-3",
                  isFav && "fill-yellow-400 text-yellow-400",
                )}
              />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(model.model_id);
              }}
            >
              <PlayCircle className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => onNewTab(e, model.model_id)}
            >
              <ExternalLink className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
});

export function ExplorePanel({
  onSelectModel,
  externalSearch,
}: ExplorePanelProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { models, toggleFavorite, isFavorite, fetchModels } = useModelsStore();
  const { createTab } = usePlaygroundStore();
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [showFavoritesOnly, setShowFavoritesOnly] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>("popularity");
  const [sortAsc, setSortAsc] = useState(false);

  // Local search state with debounce
  const [searchInput, setSearchInput] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearchChange = useCallback((value: string) => {
    setSearchInput(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => setSearchDebounced(value), 250);
  }, []);
  const handleSearchClear = useCallback(() => {
    setSearchInput("");
    setSearchDebounced("");
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
  }, []);

  const search = externalSearch ?? searchDebounced;

  const allTypes = useMemo(() => {
    const typeSet = new Set<string>();
    models.forEach((m) => {
      if (m.type) typeSet.add(m.type);
    });
    return Array.from(typeSet).sort();
  }, [models]);

  // Deferred filtered+sorted list — computed after paint to avoid blocking first render
  const [filteredModels, setFilteredModels] = useState<typeof models>([]);
  useEffect(() => {
    let cancelled = false;
    const compute = () => {
      if (cancelled) return;
      let result = models;
      if (showFavoritesOnly) result = result.filter((m) => isFavorite(m.model_id));
      if (typeFilter) result = result.filter((m) => m.type === typeFilter);
      if (search.trim()) {
        const r = fuzzySearch(result, search, (m) => [getModelShortName(m.model_id), m.model_id]).map((r) => r.item);
        if (!cancelled) setFilteredModels(r);
        return;
      }
      const sorted = [...result].sort((a, b) => {
        if (sortKey === "name") return getModelShortName(a.model_id).localeCompare(getModelShortName(b.model_id));
        if (sortKey === "price") return (a.base_price ?? 0) - (b.base_price ?? 0);
        return (a.sort_order ?? 9999) - (b.sort_order ?? 9999);
      });
      if (!cancelled) setFilteredModels(sortAsc ? sorted : sorted.reverse());
    };
    // Use scheduler: defer to after paint on first load, immediate on user interaction
    const id = requestAnimationFrame(compute);
    return () => { cancelled = true; cancelAnimationFrame(id); };
  }, [models, search, typeFilter, showFavoritesOnly, isFavorite, sortKey, sortAsc]);

  // Virtualized grid setup
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const CARD_HEIGHT = 80;

  // Cols: observe the scroll container (overflow-y-auto) — its width is the true available space.
  // Fallback: also listen to window resize so nothing is missed.
  const MIN_CARD_WIDTH = 200;
  const MAX_COLS = 4;
  const calcCols = (w: number) => Math.min(MAX_COLS, Math.max(1, Math.floor(w / MIN_CARD_WIDTH)));
  const [cols, setCols] = useState(4);

  useEffect(() => {
    const measure = () => {
      const el = scrollContainerRef.current;
      if (el) setCols(calcCols(el.getBoundingClientRect().width));
    };

    // ResizeObserver on the scroll container itself
    let obs: ResizeObserver | null = null;
    const el = scrollContainerRef.current;
    if (el) {
      measure(); // immediate
      obs = new ResizeObserver(measure);
      obs.observe(el);
    }

    // Belt-and-suspenders: window resize catches cases where the element
    // doesn't change size itself but the layout shifts (e.g. sidebar collapse)
    window.addEventListener("resize", measure);

    return () => {
      obs?.disconnect();
      window.removeEventListener("resize", measure);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // scrollContainerRef.current is stable after mount

  // Re-measure when scrollContainerRef actually gets assigned (first render)
  const scrollRefCallback = useCallback((el: HTMLDivElement | null) => {
    (scrollContainerRef as React.MutableRefObject<HTMLDivElement | null>).current = el;
    if (el) setCols(calcCols(el.getBoundingClientRect().width));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rowCount = Math.ceil(filteredModels.length / cols);
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => CARD_HEIGHT + 8,
    overscan: 5,
  });

  const handleToggleFavorite = useCallback(    (e: React.MouseEvent, modelId: string) => {
      e.stopPropagation();
      toggleFavorite(modelId);
    },
    [toggleFavorite],
  );

  const handleOpenInNewTab = useCallback(
    (e: React.MouseEvent, modelId: string) => {
      e.stopPropagation();
      const model = models.find((m) => m.model_id === modelId);
      createTab(model);
      navigate(`/playground/${encodeURIComponent(modelId)}`);
    },
    [models, createTab, navigate],
  );

  const sortLabels: Record<SortKey, string> = {
    popularity: t("models.popularity", "Popularity"),
    name: t("models.name", "Name"),
    price: t("models.price", "Price"),
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Search bar with controls */}
      {externalSearch == null && (
        <div className="px-4 pt-3 pb-2 shrink-0">
          <div className="flex items-center gap-2">
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60 pointer-events-none" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder={t(
                  "playground.explore.searchPlaceholder",
                  "Search models...",
                )}
                className="w-full h-[34px] pl-9 pr-8 rounded-lg border border-border bg-muted/40 text-sm placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/30 transition-all"
              />
              {searchInput && (
                <button
                  onClick={handleSearchClear}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Favorites toggle */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-[34px] w-[34px] p-0 shrink-0 border border-border",
                showFavoritesOnly &&
                  "bg-yellow-500/10 border-yellow-500/30 text-yellow-500",
              )}
              onClick={() => setShowFavoritesOnly(!showFavoritesOnly)}
            >
              <Star
                className={cn(
                  "h-4 w-4",
                  showFavoritesOnly && "fill-yellow-400 text-yellow-400",
                )}
              />
            </Button>

            {/* Sort dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-[34px] px-2.5 shrink-0 border border-border text-xs font-medium gap-1"
                >
                  {sortLabels[sortKey]}
                  <ChevronDown className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="min-w-[120px]">
                {(Object.keys(sortLabels) as SortKey[]).map((key) => (
                  <DropdownMenuItem
                    key={key}
                    onClick={() => setSortKey(key)}
                    className={cn(
                      "text-xs",
                      sortKey === key && "font-semibold text-primary",
                    )}
                  >
                    {sortLabels[key]}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Sort direction */}
            <Button
              variant="ghost"
              size="sm"
              className="h-[34px] w-[34px] p-0 shrink-0 border border-border"
              onClick={() => setSortAsc(!sortAsc)}
            >
              {sortAsc ? (
                <ArrowDownNarrowWide className="h-4 w-4" />
              ) : (
                <ArrowUpNarrowWide className="h-4 w-4" />
              )}
            </Button>

            {/* Refresh button */}
            <Button
              variant="ghost"
              size="sm"
              className="h-[34px] px-2.5 shrink-0 border border-border text-xs font-medium gap-1.5"
              disabled={isRefreshing}
              onClick={async () => {
                setIsRefreshing(true);
                try {
                  await fetchModels(true);
                } finally {
                  setIsRefreshing(false);
                }
              }}
            >
              <RefreshCw className={cn("h-3.5 w-3.5", isRefreshing && "animate-spin")} />
              {t("common.refresh", "Refresh")}
            </Button>
          </div>
        </div>
      )}
      <div ref={scrollRefCallback} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="px-4 pb-6 pt-3">
          {/* All Models heading */}
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {showFavoritesOnly
              ? t("playground.explore.favorites", "Favorites")
              : search
                ? t("playground.explore.searchResults", "{{count}} results", {
                    count: filteredModels.length,
                  })
                : t("playground.explore.allModels", "All Models")}
          </h3>

          {/* Category tags — wrap to show all */}
          <div className="flex gap-1.5 flex-wrap mb-3">
            <button
              onClick={() => setTypeFilter(null)}
              className={cn(
                "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors whitespace-nowrap",
                !typeFilter
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {t("playground.explore.all", "All")}
            </button>
            {allTypes.map((type) => (
              <button
                key={type}
                onClick={() => setTypeFilter(typeFilter === type ? null : type)}
                className={cn(
                  "text-[10px] px-2 py-0.5 rounded-full font-medium transition-colors whitespace-nowrap",
                  typeFilter === type
                    ? "ring-1 ring-current " + getTypeColor(type)
                    : getTypeColor(type) + " hover:opacity-80",
                )}
              >
                {type}
              </button>
            ))}
          </div>

          {/* Models grid — virtualized rows */}
          {filteredModels.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {showFavoritesOnly
                ? t("playground.explore.noFavorites", "No favorites yet — star a model to save it here")
                : t("models.noResults", "No models found")}
            </div>
          ) : (
            <div
              key={cols}
              style={{ height: `${rowVirtualizer.getTotalSize()}px`, position: "relative" }}
            >
              {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                const rowModels = filteredModels.slice(
                  virtualRow.index * cols,
                  virtualRow.index * cols + cols,
                );
                return (
                  <div
                    key={virtualRow.key}
                    style={{
                      position: "absolute",
                      top: 0,
                      left: 0,
                      right: 0,
                      height: `${virtualRow.size - 8}px`,
                      transform: `translateY(${virtualRow.start}px)`,
                      display: "grid",
                      gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
                      gap: "8px",
                      marginBottom: "8px",
                    }}
                  >
                    {rowModels.map((model) => (
                      <ModelCard
                        key={model.model_id}
                        model={model}
                        isFav={isFavorite(model.model_id)}
                        onSelect={onSelectModel}
                        onToggleFav={handleToggleFavorite}
                        onNewTab={handleOpenInNewTab}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
