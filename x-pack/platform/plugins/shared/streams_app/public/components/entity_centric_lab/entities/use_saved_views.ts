/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useState } from 'react';
import type { Filter } from '@kbn/es-query';
import type { ActiveExtraFilters, ActiveTagFilters, EntityCategoryId } from './fake_entities';
import { EMPTY_TAG_FILTERS, TAG_KEYS, isKnownCategoryId } from './fake_entities';

/**
 * Saved views for the entity-centric lab prototype.
 *
 * A "view" is a named snapshot of everything the user can pick on the
 * `/entities` and `/entities/{category}` pages that isn't derived from
 * the underlying dataset:
 *
 *   - `category`       — the active category route (or `null` for the
 *                        cross-category "All entities" page).
 *   - `tab`            — the Overview / Inventory tab choice.
 *   - `viewMode`       — the Grid / List / Geomap segmented control.
 *   - `search`         — the free-text name filter.
 *   - `filters`        — the Team / Application / Environment / Region
 *                        tag filters, in the same shape the page uses at
 *                        runtime ({@link ActiveTagFilters}).
 *
 * Time range is intentionally *not* captured: it lives in the URL and
 * is shared with the rest of Streams, so saving it inside a view would
 * fight the shared timefilter. Refresh interval is out of scope for
 * the same reason.
 *
 * Storage is per-browser `localStorage` (matching the other lab prefs:
 * `useCategoryTab`, `useEntitiesTagFilters`, `useEntitiesViewMode`,
 * `useOverviewLayoutMode`, `useBucketMetricSelection`). This is a lab
 * prototype — a real implementation would use a saved-object so views
 * can be shared across users.
 */

export type CategoryTab = 'inventory' | 'monitoring';
export type ViewMode = 'grid' | 'list' | 'geomap';

export interface SavedViewState {
  readonly category: EntityCategoryId | null;
  /**
   * Cloud provider (`aws` / `gcp` / `azure`) when the view was saved on a
   * `/entities/cloud/{provider}` route, else `null`. Always paired with
   * `category: 'cloud'`. Without this, a view saved on a cloud sub-page would
   * only remember `category: 'cloud'` and reload the whole Cloud page.
   */
  readonly cloudProvider: string | null;
  /**
   * Cloud service (e.g. `s3`, `ec2`) when the view was saved on a
   * `/entities/cloud/{provider}/{service}` route, else `null`. Requires
   * `cloudProvider`.
   */
  readonly cloudService: string | null;
  readonly tab: CategoryTab;
  readonly viewMode: ViewMode;
  readonly search: string;
  readonly filters: ActiveTagFilters;
  /**
   * Entity-type-specific "extra" facet selections (e.g. Hosts → OS / Cloud
   * provider / Service name), keyed by attribute. ElasticOn only; empty
   * elsewhere. Optional for backward compatibility with views saved before
   * this field existed.
   */
  readonly extraFilters?: ActiveExtraFilters;
  /**
   * The search bar's "+ Add filter" chips. ElasticOn only; empty elsewhere.
   * Optional for backward compatibility.
   */
  readonly queryFilters?: Filter[];
  /**
   * "Store time with view": when `true`, loading the view resets the shared
   * time filter to {@link timeRange} (mirrors Kibana's saved-search behavior).
   * When `false`/absent the view leaves the current time range untouched.
   */
  readonly storeTime?: boolean;
  /**
   * The time range captured when the view was saved with {@link storeTime} on.
   * Stored as-is (supports relative like `now-15m` and absolute values).
   */
  readonly timeRange?: { readonly from: string; readonly to: string };
}

export interface SavedView {
  readonly id: string;
  readonly name: string;
  readonly createdAt: number;
  readonly updatedAt: number;
  readonly state: SavedViewState;
}

const SAVED_VIEWS_KEY = 'entityCentricLab.savedViews.v1';
const CURRENT_VIEW_KEY = 'entityCentricLab.savedViews.currentId.v1';
// The user's chosen "default" view — the one auto-loaded the first time the
// Infrastructure landing is opened in a browser session (ElasticOn only).
const DEFAULT_VIEW_KEY = 'entityCentricLab.savedViews.defaultId.v1';
// Per-session guard so the default view is applied at most once per browser
// session (sessionStorage clears when the tab/window closes). Kept here so the
// storage keys stay in one place; consumed by the entities page's auto-load.
const DEFAULT_APPLIED_SESSION_KEY = 'entityCentricLab.savedViews.defaultApplied.v1';

// ---------------------------------------------------------------------------
// Mirrored storage keys
// ---------------------------------------------------------------------------
//
// These three keys are also defined at the top of `all_entities_view.tsx`
// (where the persisted-hook setters live). Duplicated intentionally so
// `applyViewToStorage` below can write to them synchronously — the
// hook-based `setFilters` / `setViewMode` / `setCategoryTab` write inside
// a `setState` updater which React may not flush before `router.push`
// unmounts the current tree, causing the destination mount to hydrate
// from stale storage.
//
// If any key changes there, mirror it here.
const CATEGORY_TAB_STORAGE_KEY = 'entityCentricLab.categoryTab.v1';
const TAG_FILTERS_STORAGE_KEY = 'entityCentricLab.entitiesTagFilters.v1';
const VIEW_MODE_STORAGE_KEY = 'entityCentricLab.entitiesViewMode.v1';

/**
 * Cross-mount signal so a second copy of the bar (e.g. after
 * navigating between `/entities` and `/entities/kubernetes`) picks up
 * writes made by the previous instance. `storage` covers other tabs
 * too, which is a nice-to-have here.
 */
const CHANGE_EVENT = 'entity-centric-lab:saved-views-changed';

// ---------------------------------------------------------------------------
// Storage helpers
// ---------------------------------------------------------------------------

const isCategoryTab = (value: unknown): value is CategoryTab =>
  value === 'inventory' || value === 'monitoring';

const isViewMode = (value: unknown): value is ViewMode =>
  value === 'grid' || value === 'list' || value === 'geomap';

const parseFilters = (value: unknown): ActiveTagFilters => {
  if (!value || typeof value !== 'object') return EMPTY_TAG_FILTERS;
  const source = value as Record<string, unknown>;
  const next: Record<string, readonly string[]> = {};
  for (const key of TAG_KEYS) {
    const entry = source[key];
    next[key] =
      Array.isArray(entry) && entry.every((item) => typeof item === 'string')
        ? (entry as readonly string[])
        : [];
  }
  return next as ActiveTagFilters;
};

const parseExtraFilters = (value: unknown): ActiveExtraFilters => {
  if (!value || typeof value !== 'object') return {};
  const source = value as Record<string, unknown>;
  const next: Record<string, readonly string[]> = {};
  for (const [key, entry] of Object.entries(source)) {
    if (Array.isArray(entry) && entry.every((item) => typeof item === 'string')) {
      next[key] = entry as readonly string[];
    }
  }
  return next;
};

const parseQueryFilters = (value: unknown): Filter[] =>
  Array.isArray(value) ? (value as Filter[]) : [];

const parseTimeRange = (value: unknown): { from: string; to: string } | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  return typeof source.from === 'string' && typeof source.to === 'string'
    ? { from: source.from, to: source.to }
    : undefined;
};

const parseState = (value: unknown): SavedViewState | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const rawCategory = source.category;
  const category =
    rawCategory === null || rawCategory === undefined
      ? null
      : typeof rawCategory === 'string' && isKnownCategoryId(rawCategory)
      ? rawCategory
      : null;
  return {
    category,
    // Cloud sub-scope only makes sense under the Cloud category; ignore stray
    // values on any other category so the route reconstructs cleanly.
    cloudProvider:
      category === 'cloud' && typeof source.cloudProvider === 'string'
        ? source.cloudProvider
        : null,
    cloudService:
      category === 'cloud' && typeof source.cloudService === 'string' ? source.cloudService : null,
    tab: isCategoryTab(source.tab) ? source.tab : 'monitoring',
    viewMode: isViewMode(source.viewMode) ? source.viewMode : 'grid',
    search: typeof source.search === 'string' ? source.search : '',
    filters: parseFilters(source.filters),
    extraFilters: parseExtraFilters(source.extraFilters),
    queryFilters: parseQueryFilters(source.queryFilters),
    storeTime: source.storeTime === true,
    timeRange: parseTimeRange(source.timeRange),
  };
};

const parseView = (value: unknown): SavedView | undefined => {
  if (!value || typeof value !== 'object') return undefined;
  const source = value as Record<string, unknown>;
  const state = parseState(source.state);
  if (!state) return undefined;
  if (typeof source.id !== 'string' || typeof source.name !== 'string') return undefined;
  return {
    id: source.id,
    name: source.name,
    createdAt: typeof source.createdAt === 'number' ? source.createdAt : Date.now(),
    updatedAt: typeof source.updatedAt === 'number' ? source.updatedAt : Date.now(),
    state,
  };
};

const readViews = (): SavedView[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(SAVED_VIEWS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const views: SavedView[] = [];
    for (const entry of parsed) {
      const view = parseView(entry);
      if (view) views.push(view);
    }
    return views;
  } catch {
    return [];
  }
};

const writeViews = (views: readonly SavedView[]): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(SAVED_VIEWS_KEY, JSON.stringify(views));
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // Storage blocked / quota exceeded — the caller's in-memory state
    // is still consistent for the current session; the persistence
    // guarantee just degrades to that session.
  }
};

const readCurrentViewId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(CURRENT_VIEW_KEY);
  } catch {
    return null;
  }
};

const readDefaultViewId = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(DEFAULT_VIEW_KEY);
  } catch {
    return null;
  }
};

const writeDefaultViewId = (id: string | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (id === null) {
      window.localStorage.removeItem(DEFAULT_VIEW_KEY);
    } else {
      window.localStorage.setItem(DEFAULT_VIEW_KEY, id);
    }
    // Same change event the nav + other bar instances listen on, so the
    // "Default" marker updates everywhere without a reload.
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // See writeViews.
  }
};

/**
 * Has the default view already been auto-applied in this browser session?
 * Backed by `sessionStorage` so it resets on a fresh session (new tab/window),
 * which is exactly the "land on my default after a new session" trigger.
 */
export const hasAppliedDefaultThisSession = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    return window.sessionStorage.getItem(DEFAULT_APPLIED_SESSION_KEY) === '1';
  } catch {
    // If sessionStorage is unavailable, treat as "already applied" so we never
    // fight the user with repeated redirects.
    return true;
  }
};

export const markDefaultAppliedThisSession = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(DEFAULT_APPLIED_SESSION_KEY, '1');
  } catch {
    // ignore — worst case the default applies again next landing this session.
  }
};

const writeCurrentViewId = (id: string | null): void => {
  if (typeof window === 'undefined') return;
  try {
    if (id === null) {
      window.localStorage.removeItem(CURRENT_VIEW_KEY);
    } else {
      window.localStorage.setItem(CURRENT_VIEW_KEY, id);
    }
    window.dispatchEvent(new Event(CHANGE_EVENT));
  } catch {
    // See writeViews.
  }
};

// ---------------------------------------------------------------------------
// Pending-search slot
// ---------------------------------------------------------------------------
//
// The `search` string is transient (per-mount local `useState`), so it
// can't ride the persisted-state pipeline that carries category tab /
// tag filters / view mode across a route change. When applying a view
// requires navigating (e.g. from `/entities/hosts` to
// `/entities/kubernetes`), park the desired search here and consume
// it once on the destination mount.

const PENDING_SEARCH_KEY = 'entityCentricLab.savedViews.pendingSearch.v1';

export const setPendingSearch = (search: string): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(PENDING_SEARCH_KEY, search);
  } catch {
    // ignore
  }
};

/**
 * Read-and-clear: returns the pending search string once, then removes
 * it. Callers should apply the value to their local `search` state on
 * mount. Returns `null` when no view apply is pending, in which case
 * the mount should leave `search` at its default (`''`).
 */
export const consumePendingSearch = (): string | null => {
  if (typeof window === 'undefined') return null;
  try {
    const value = window.localStorage.getItem(PENDING_SEARCH_KEY);
    if (value === null) return null;
    window.localStorage.removeItem(PENDING_SEARCH_KEY);
    return value;
  } catch {
    return null;
  }
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export interface UseSavedViewsResult {
  readonly views: readonly SavedView[];
  readonly currentViewId: string | null;
  readonly currentView: SavedView | undefined;
  /** The view marked as the session-landing default, or `null` when unset. */
  readonly defaultViewId: string | null;
  readonly saveView: (name: string, state: SavedViewState) => SavedView;
  readonly updateViewState: (id: string, state: SavedViewState) => void;
  readonly renameView: (id: string, name: string) => void;
  /** Toggle a view's "store time" flag; pass `timeRange` when enabling. */
  readonly setViewStoreTime: (
    id: string,
    storeTime: boolean,
    timeRange?: { from: string; to: string }
  ) => void;
  readonly deleteView: (id: string) => void;
  readonly setCurrentViewId: (id: string | null) => void;
  /** Mark a view as the default (`null` clears it). */
  readonly setDefaultView: (id: string | null) => void;
}

const generateId = (): string => {
  const now = Date.now();
  const suffix = Math.random().toString(36).slice(2, 8);
  return `v_${now}_${suffix}`;
};

export const useSavedViews = (): UseSavedViewsResult => {
  const [views, setViews] = useState<readonly SavedView[]>(() => readViews());
  const [currentViewId, setCurrentViewIdState] = useState<string | null>(() => readCurrentViewId());
  const [defaultViewId, setDefaultViewIdState] = useState<string | null>(() => readDefaultViewId());

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    // Both an intra-tab custom event (dispatched by our writers) *and*
    // the native `storage` event (fired in *other* tabs when localStorage
    // changes) refresh the in-memory copy. The intra-tab event is what
    // keeps two mounted `SavedViewsBar` instances (parent + child after
    // navigation) in sync during a single-page session.
    const listener = () => {
      setViews(readViews());
      setCurrentViewIdState(readCurrentViewId());
      setDefaultViewIdState(readDefaultViewId());
    };
    window.addEventListener(CHANGE_EVENT, listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener(CHANGE_EVENT, listener);
      window.removeEventListener('storage', listener);
    };
  }, []);

  const saveView = useCallback((name: string, state: SavedViewState): SavedView => {
    const now = Date.now();
    const view: SavedView = { id: generateId(), name, createdAt: now, updatedAt: now, state };
    writeViews([...readViews(), view]);
    writeCurrentViewId(view.id);
    return view;
  }, []);

  const updateViewState = useCallback((id: string, state: SavedViewState) => {
    const next = readViews().map((view) =>
      view.id === id ? { ...view, state, updatedAt: Date.now() } : view
    );
    writeViews(next);
  }, []);

  const renameView = useCallback((id: string, name: string) => {
    const next = readViews().map((view) =>
      view.id === id ? { ...view, name, updatedAt: Date.now() } : view
    );
    writeViews(next);
  }, []);

  // Flip a view's "store time" flag (from the Manage modal). Capturing the
  // range is the caller's job — pass `timeRange` when enabling; it's cleared
  // when disabling.
  const setViewStoreTime = useCallback(
    (id: string, storeTime: boolean, timeRange?: { from: string; to: string }) => {
      const next = readViews().map((view) =>
        view.id === id
          ? {
              ...view,
              updatedAt: Date.now(),
              state: {
                ...view.state,
                storeTime,
                timeRange: storeTime ? timeRange ?? view.state.timeRange : undefined,
              },
            }
          : view
      );
      writeViews(next);
    },
    []
  );

  const deleteView = useCallback((id: string) => {
    writeViews(readViews().filter((view) => view.id !== id));
    if (readCurrentViewId() === id) writeCurrentViewId(null);
    // A deleted view can't remain the default.
    if (readDefaultViewId() === id) writeDefaultViewId(null);
  }, []);

  const setCurrentViewId = useCallback((id: string | null) => writeCurrentViewId(id), []);

  const setDefaultView = useCallback((id: string | null) => writeDefaultViewId(id), []);

  const currentView = views.find((view) => view.id === currentViewId);

  return {
    views,
    currentViewId,
    currentView,
    defaultViewId,
    saveView,
    updateViewState,
    renameView,
    setViewStoreTime,
    deleteView,
    setCurrentViewId,
    setDefaultView,
  };
};

// ---------------------------------------------------------------------------
// State equality (drives the "modified" indicator)
// ---------------------------------------------------------------------------

const canonicalFilters = (filters: ActiveTagFilters): Record<string, readonly string[]> => {
  const out: Record<string, readonly string[]> = {};
  for (const key of TAG_KEYS) {
    const values = filters[key] ?? [];
    // Copy + sort so `['a','b']` equals `['b','a']` — filter *order*
    // isn't user-visible, so treating them as different views would
    // spuriously light the "Modified" badge.
    out[key] = [...values].sort();
  }
  return out;
};

// Drop empty selections and sort so `{ os: [] }` equals `{}` and value
// order doesn't spuriously light the "Modified" badge.
const canonicalExtraFilters = (
  extra: ActiveExtraFilters = {}
): Record<string, readonly string[]> => {
  const out: Record<string, readonly string[]> = {};
  for (const key of Object.keys(extra).sort()) {
    const values = extra[key] ?? [];
    if (values.length > 0) out[key] = [...values].sort();
  }
  return out;
};

// Reduce each "+ Add filter" chip to the fields that actually affect the
// in-memory filtering (see `entityMatchesFilters`), ignoring volatile bits
// like `$state` and index refs so re-loading a view doesn't read as modified.
const canonicalQueryFilters = (filters: readonly Filter[] = []) =>
  filters.map((filter) => ({
    key: filter.meta?.key ?? null,
    negate: Boolean(filter.meta?.negate),
    disabled: Boolean(filter.meta?.disabled),
    query: (filter.meta?.params as { query?: unknown } | undefined)?.query ?? null,
  }));

const canonicalState = (state: SavedViewState) => ({
  category: state.category,
  cloudProvider: state.cloudProvider,
  cloudService: state.cloudService,
  tab: state.tab,
  viewMode: state.viewMode,
  search: state.search,
  filters: canonicalFilters(state.filters),
  extraFilters: canonicalExtraFilters(state.extraFilters),
  queryFilters: canonicalQueryFilters(state.queryFilters),
  storeTime: Boolean(state.storeTime),
  // Only compare the captured range when the view stores time — otherwise a
  // stray value shouldn't light the "Modified" badge.
  timeRange: state.storeTime
    ? { from: state.timeRange?.from ?? '', to: state.timeRange?.to ?? '' }
    : null,
});

export const areStatesEqual = (a: SavedViewState, b: SavedViewState): boolean => {
  return JSON.stringify(canonicalState(a)) === JSON.stringify(canonicalState(b));
};

// ---------------------------------------------------------------------------
// Cross-route apply helper
// ---------------------------------------------------------------------------

/**
 * Write a view's `state` to every localStorage slot the entities page
 * reads on mount:
 *
 *   - The category tab / tag filters / view-mode persistence keys
 *     used by `useCategoryTab` / `useEntitiesTagFilters` /
 *     `useEntitiesViewMode`.
 *   - The pending-search slot (transient — `search` isn't persisted).
 *   - The current-view id (drives the "loaded view" label and the
 *     "Modified" indicator).
 *
 * Callers should invoke this *before* triggering navigation so the
 * destination mount hydrates from the freshly-written values. When the
 * apply is same-route, callers still benefit from calling this (it
 * keeps storage authoritative) and should additionally call the local
 * `useState` setters so the current mount reflects the new state
 * without waiting for a re-hydrate.
 */
export const applyViewToStorage = (view: SavedView): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(CATEGORY_TAB_STORAGE_KEY, view.state.tab);
    window.localStorage.setItem(TAG_FILTERS_STORAGE_KEY, JSON.stringify(view.state.filters));
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, view.state.viewMode);
  } catch {
    // Same trade-off as the other write helpers: the in-memory copy
    // still works for the current session; the view just won't survive
    // a navigation.
  }
  setPendingSearch(view.state.search);
  writeCurrentViewId(view.id);
};
