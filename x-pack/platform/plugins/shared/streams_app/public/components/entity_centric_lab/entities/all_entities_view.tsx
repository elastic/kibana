/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useHistory, useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import type { Filter, Query } from '@kbn/es-query';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCopy,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiSwitch,
  EuiTitle,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';

// The Streams page body is a column flex container with `height: 100%`.
// `EuiFlexGroup` bakes `flex-grow: 1` into its CSS with no prop to disable
// it, so any EuiFlexGroup used as a "toolbar" row would absorb the empty
// vertical space freed up when filtering shrinks the grid below — the
// "each new filter adds more space" symptom. Pin `flex-grow` to `0` so
// toolbars stay at content height.
const NO_GROW = css`
  flex-grow: 0;
`;

// Fixed-width column for the in-page Cloud tree so the main content keeps
// the rest of the row. `flex-shrink: 0` stops the nav collapsing when the
// grid/list is wide.
const CLOUD_SIDE_NAV_COLUMN = css`
  width: 220px;
  flex-shrink: 0;
`;

import {
  EntityFlyout,
  EntityFlyoutServicesProvider,
  entityTypeToKind,
  inferEntityKind,
  isEntityTypeEnabled,
  resolveEntityTypeIdForName,
  type EntityKind,
  type EntitySelectionContext,
  type EntityDashboardRenderContext,
} from '@kbn/entity-centric-lab-flyout';
import { FAKE_ENTITY_TYPES } from '../fake_entity_types';
import { K8sDetailDashboard, getK8sDetailDashboardConfig } from './k8s_detail_dashboard';

/**
 * Last-ditch fallback when neither the entity's `.type` string nor any
 * curated row in the Manage entity types table matches the displayed
 * entity. Keyed by {@link EntityKind} so the cog icon at least lands
 * the user on a related row instead of the cross-category list.
 * Inferred-only kinds (`'middleware'`, `'llm'`, ...) intentionally
 * fall through — they don't have a deterministic single row.
 */
const KIND_TO_FALLBACK_ENTITY_TYPE_ID: Partial<Record<EntityKind, string>> = {
  service: 'apm-service',
  cluster: 'k8s-cluster',
  node: 'k8s-node',
  pod: 'k8s-pod',
  // Hosts cover Bare-metal and VM rows — pick the first as the
  // fallback; the typed lookup below resolves the exact one when the
  // entity's `.type` is known.
  host: 'bare-metal-host',
};

/**
 * Find the Manage entity types row whose `name` equals the entity's
 * `.type` string (case-insensitive). When present this is the
 * tightest possible link target for the cog — clicking from a
 * `Bare-metal` host lands on the `bare-metal-host` form, clicking
 * from a `VM` host lands on `vm-host`, etc.
 */
const findEntityTypeIdByName = (typeName: string | undefined): string | undefined => {
  if (!typeName) return undefined;
  const lower = typeName.toLowerCase();
  return FAKE_ENTITY_TYPES.find((entityType) => entityType.name.toLowerCase() === lower)?.id;
};
import { StreamsAppPageTemplate } from '../../streams_app_page_template';
import { useStreamsAppRouter } from '../../../hooks/use_streams_app_router';
import { useKibana } from '../../../hooks/use_kibana';
import { useTimeRange } from '../../../hooks/use_time_range';
import { useTimeRangeUpdate } from '../../../hooks/use_time_range_update';
import { useTimefilter } from '../../../hooks/use_timefilter';
import type {
  ActiveExtraFilters,
  ActiveTagFilters,
  Entity,
  EntityCategoryId,
} from './fake_entities';
import { getCloudProvider, getCloudService, type CloudProviderId } from './cloud_providers';
import { useCloudHierarchyEnabled } from './use_cloud_hierarchy';
import {
  EMPTY_EXTRA_FILTERS,
  EMPTY_TAG_FILTERS,
  TAG_KEYS,
  buildFakeEntities,
  getCategoryDescriptor,
  getCategoryExtraFilters,
  getExtraFacets,
  getTagFacets,
  matchesExtraFilters,
  matchesTagFilters,
} from './fake_entities';
import { GroupedGridView } from './grouped_grid_view';
import { CloudSideNav } from './cloud_side_nav';
import { EntitiesListView } from './entities_list_view';
import { GeomapView } from './geomap_view';
import { EntitiesTagFilters } from './entities_tag_filters';
import { EntityExtraFilters } from './entity_extra_filters';
import { EntityGroupByControls } from './entity_group_by_controls';
import {
  DEFAULT_GROUP_BY,
  getGroupByFields,
  isDefaultGroupBy,
  resolveGroupByFields,
  type GroupByFieldDef,
  type GroupByFieldId,
} from './entity_group_by';
import { AllEntitiesOverviewView } from './all_entities_overview_view';
import { MonitoringAssetsView } from './monitoring_assets_view';
import { SavedViewsBar } from './saved_views_bar';
import { SaveViewButton } from './save_view_button';
import { compileEntityKql, entityMatchesFilters } from './entity_kql';
import { useEntityLabDataView } from './use_entity_lab_data_view';
import { useEntityValueSuggestions } from './use_entity_value_suggestions';
import {
  applyViewToStorage,
  areStatesEqual,
  consumePendingSearch,
  hasAppliedDefaultThisSession,
  markDefaultAppliedThisSession,
  useSavedViews,
  type SavedView,
  type SavedViewState,
} from './use_saved_views';

/**
 * Tabs shown on the category-scoped pages. `inventory` is the existing
 * search / filter / grid-list-geomap surface; `monitoring` swaps the body
 * for the Overview view (integration assets + operational signals). The
 * same tab pair is now shown on the cross-category `/entities` page,
 * where the Overview aggregates every category into one collapsible
 * stack (see `AllEntitiesOverviewView`) — this gives users a single
 * "what's happening everywhere" landing surface without forcing them
 * to click into each category.
 */
type CategoryTab = 'inventory' | 'monitoring';

type ViewMode = 'grid' | 'list' | 'geomap';

/**
 * localStorage key for the user's last-used Grouped grid / List choice.
 * Bumped to v1 to claim a stable key — old keys (if we ever change the
 * shape) can be invalidated by bumping the suffix.
 */
const VIEW_MODE_STORAGE_KEY = 'entityCentricLab.entitiesViewMode.v1';

const isViewMode = (value: unknown): value is ViewMode =>
  value === 'grid' || value === 'list' || value === 'geomap';

/**
 * View-mode state that survives navigation between the cross-category
 * page (`/entities`) and the per-category pages (`/entities/hosts`,
 * `/entities/kubernetes`, ...). Both surfaces remount `AllEntitiesView`
 * on every nav, so plain `useState` would reset to `'grid'` each time
 * — instead we hydrate from localStorage on first render and persist
 * on every change. No cross-bundle/tab sync needed; the user is always
 * in one tab when they click around.
 */
const useEntitiesViewMode = (): [ViewMode, (next: ViewMode) => void] => {
  const [viewMode, setViewModeState] = useState<ViewMode>(() => {
    if (typeof window === 'undefined') return 'grid';
    try {
      const raw = window.localStorage.getItem(VIEW_MODE_STORAGE_KEY);
      return isViewMode(raw) ? raw : 'grid';
    } catch {
      return 'grid';
    }
  });
  const setViewMode = useCallback((next: ViewMode) => {
    setViewModeState(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, next);
    } catch {
      // Storage blocked / quota exceeded — keep the in-memory value so
      // the current session still works; the preference just won't
      // persist across navigation.
    }
  }, []);
  return [viewMode, setViewMode];
};

// --- Category-tab + tag-filter persistence ---------------------------
//
// Both the Overview/Inventory tab choice and the tag filter selection
// need to survive the left-nav walk between categories (Kubernetes →
// Hosts → Databases → …). Each of those routes remounts
// `AllEntitiesView`, so plain `useState` would reset the tab to
// "Overview" and clear the filters every time. Same pattern as
// `useEntitiesViewMode`: hydrate lazily from `localStorage` on first
// render, write on every change, no cross-tab sync.

const CATEGORY_TAB_STORAGE_KEY = 'entityCentricLab.categoryTab.v1';
const TAG_FILTERS_STORAGE_KEY = 'entityCentricLab.entitiesTagFilters.v1';

const isCategoryTab = (value: unknown): value is CategoryTab =>
  value === 'inventory' || value === 'monitoring';

const useCategoryTab = (): [CategoryTab, (next: CategoryTab) => void] => {
  const [tab, setTabState] = useState<CategoryTab>(() => {
    if (typeof window === 'undefined') return 'monitoring';
    try {
      const raw = window.localStorage.getItem(CATEGORY_TAB_STORAGE_KEY);
      return isCategoryTab(raw) ? raw : 'monitoring';
    } catch {
      return 'monitoring';
    }
  });
  const setTab = useCallback((next: CategoryTab) => {
    setTabState(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(CATEGORY_TAB_STORAGE_KEY, next);
    } catch {
      // Storage blocked / quota exceeded — the in-memory value still
      // works, the choice just won't survive the next navigation.
    }
  }, []);
  return [tab, setTab];
};

/**
 * Narrow an arbitrary parsed JSON value to {@link ActiveTagFilters}.
 * Guards against every failure mode we've hit in practice (missing
 * keys, non-array values, non-string items, dropped fields after a
 * schema bump) so a corrupt `localStorage` payload from a prior lab
 * session can never crash the tab.
 */
const parseStoredTagFilters = (raw: string | null): ActiveTagFilters => {
  if (!raw) return EMPTY_TAG_FILTERS;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return EMPTY_TAG_FILTERS;
    const source = parsed as Record<string, unknown>;
    const next: Record<string, readonly string[]> = {};
    for (const key of TAG_KEYS) {
      const value = source[key];
      next[key] =
        Array.isArray(value) && value.every((entry) => typeof entry === 'string')
          ? (value as readonly string[])
          : [];
    }
    return next as ActiveTagFilters;
  } catch {
    return EMPTY_TAG_FILTERS;
  }
};

const useEntitiesTagFilters = (): [
  ActiveTagFilters,
  React.Dispatch<React.SetStateAction<ActiveTagFilters>>
] => {
  const [filters, setFiltersState] = useState<ActiveTagFilters>(() => {
    if (typeof window === 'undefined') return EMPTY_TAG_FILTERS;
    try {
      return parseStoredTagFilters(window.localStorage.getItem(TAG_FILTERS_STORAGE_KEY));
    } catch {
      return EMPTY_TAG_FILTERS;
    }
  });
  const setFilters: React.Dispatch<React.SetStateAction<ActiveTagFilters>> = useCallback((next) => {
    setFiltersState((prev) => {
      const resolved = typeof next === 'function' ? next(prev) : next;
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(TAG_FILTERS_STORAGE_KEY, JSON.stringify(resolved));
        } catch {
          // Storage failure — same trade-off as above.
        }
      }
      return resolved;
    });
  }, []);
  return [filters, setFilters];
};

// --- Group-by persistence (ElasticOn) -------------------------------
//
// Same lazy-hydrate-from-localStorage pattern as the view mode / tag
// filters so a chosen grouping survives the left-nav walk between
// categories. Mirrored in `use_saved_views.ts` (GROUP_BY_STORAGE_KEY)
// so `applyViewToStorage` can write it synchronously before a route
// change.
const GROUP_BY_STORAGE_KEY = 'entityCentricLab.entitiesGroupBy.v1';

const parseStoredGroupBy = (raw: string | null): GroupByFieldId[] => {
  if (!raw) return [...DEFAULT_GROUP_BY];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      return parsed as GroupByFieldId[];
    }
  } catch {
    // fall through
  }
  return [...DEFAULT_GROUP_BY];
};

const useEntitiesGroupBy = (): [GroupByFieldId[], (next: GroupByFieldId[]) => void] => {
  const [groupBy, setGroupByState] = useState<GroupByFieldId[]>(() => {
    if (typeof window === 'undefined') return [...DEFAULT_GROUP_BY];
    try {
      return parseStoredGroupBy(window.localStorage.getItem(GROUP_BY_STORAGE_KEY));
    } catch {
      return [...DEFAULT_GROUP_BY];
    }
  });
  const setGroupBy = useCallback((next: GroupByFieldId[]) => {
    setGroupByState(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(GROUP_BY_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage blocked — keep the in-memory value for this session.
    }
  }, []);
  return [groupBy, setGroupBy];
};

const VIEW_MODE_OPTIONS = [
  {
    id: 'grid' as const,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.viewMode.grid', {
      defaultMessage: 'Grouped grid',
    }),
    iconType: 'apps',
  },
  {
    id: 'list' as const,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.viewMode.list', {
      defaultMessage: 'List',
    }),
    iconType: 'list',
  },
  {
    id: 'geomap' as const,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.viewMode.geomap', {
      defaultMessage: 'Geomap',
    }),
    iconType: 'visMapRegion',
  },
];

interface AllEntitiesViewProps {
  /**
   * When set, the view is scoped to a single category — it shows only
   * entities whose `category` matches, and the page title swaps from
   * "All entities" to the descriptor's label + icon. Used by the category
   * routes (e.g. `/entities/hosts`) which mount this component through
   * `CategoryEntitiesView`. Undefined (the default) renders the full
   * cross-category page mounted at `/entities`.
   */
  readonly categoryScope?: EntityCategoryId;
  /**
   * Cloud provider scope (`aws` / `gcp` / `azure`) for the
   * `/entities/cloud/{provider}` route. Always paired with
   * `categoryScope="cloud"`. Narrows the slice to that provider and
   * swaps the header to the provider label + logo.
   */
  readonly cloudProviderScope?: CloudProviderId;
  /**
   * Cloud service scope (e.g. `ec2`) for the
   * `/entities/cloud/{provider}/{service}` route. Requires
   * `cloudProviderScope`. Narrows the slice to that service.
   */
  readonly cloudServiceScope?: string;
}

export const AllEntitiesView = ({
  categoryScope,
  cloudProviderScope,
  cloudServiceScope,
}: AllEntitiesViewProps = {}) => {
  const router = useStreamsAppRouter();
  // Reactive location: the Latest nav's "Saved views" links carry a
  // `?loadView=<id>` param we resolve + apply (see effect below). Reading via
  // react-router keeps the apply working whether the click remounts this
  // component (cross-category) or just updates the query on the current route
  // (same-category).
  const location = useLocation();
  const history = useHistory();
  const {
    core: { notifications, uiSettings },
    dependencies: {
      start: { agentBuilder, charts, unifiedSearch },
    },
  } = useKibana();
  // Lab experience mode (Stack Management → Advanced Settings → Discover). The
  // key is inlined to avoid a cross-plugin import of Discover internals; it is
  // a stable public contract registered in `discover/server/ui_settings.ts`.
  // In `infraShortTerm` mode we strip every "Manage entity types" affordance
  // (toolbar button + flyout cog) and reduce the flyout tab set. We subscribe
  // to the setting live so flipping modes takes effect on re-render rather than
  // relying on a full page reload (a one-shot read is computed only at mount,
  // which left this stale after switching between modes).
  const labMode = useObservable(
    uiSettings.get$<string>('discover:labMode', 'off'),
    uiSettings.get<string>('discover:labMode', 'off')
  );
  const isInfraShortTerm = labMode === 'infraShortTerm';
  // `latest` (and its `elasticOn` clone) are separate lab experiences we iterate
  // on independently of `entityCentric`. In these modes the Monitoring assets
  // surface is gone, so the entity pages drop the Inventory/Monitoring tab strip
  // and render the Inventory surface directly. This flag must never affect any
  // other mode.
  const isLatest = labMode === 'latest' || labMode === 'elasticOn';
  // The "default view" affordance (Save dialog toggle, Manage star, auto-load on
  // session landing) is ElasticOn-only per product scope; `latest` keeps saved
  // views without a default.
  const isElasticOn = labMode === 'elasticOn';
  // URL-state-backed time range, shared with every other Streams page
  // through the same `rangeFrom`/`rangeTo` search params. The lab dataset
  // is static so the picked range doesn't actually filter the entities
  // (yet) — but routing through the canonical hooks keeps the picker
  // honest: changes survive navigation, the chrome-level refresh button
  // works, and any future wiring to live data only needs to consume
  // these timestamps.
  const { rangeFrom, rangeTo } = useTimeRange();
  const { updateTimeRange } = useTimeRangeUpdate();
  const { refresh } = useTimefilter();
  const handleTimeChange = useCallback(
    ({ start, end }: { start: string; end: string }) => updateTimeRange({ from: start, to: end }),
    [updateTimeRange]
  );
  const handleTimeRefresh = useCallback(() => refresh(), [refresh]);

  // ElasticOn Inventory unified search bar: an ad-hoc data view (fields only,
  // no backing index) powers autocomplete + "+ Add filter"; the KQL / filters
  // are evaluated against the seeded entities in-memory (see `entity_kql.ts`).
  const labDataView = useEntityLabDataView(isElasticOn);
  // "+ Add filter" chips (transient; not persisted with saved views yet).
  const [labFilters, setLabFilters] = useState<Filter[]>([]);
  // Bumped on every (auto-)refresh to re-roll the fake metric readings so
  // the hex map visibly "lives". The grid consumes the tick to re-seed the
  // reading salt (see GroupedGridView), keeping tiles + tooltips consistent.
  const [refreshTick, setRefreshTick] = useState(0);
  const handleLiveRefresh = useCallback(() => {
    setRefreshTick((tick) => tick + 1);
    refresh();
  }, [refresh]);

  // Saved views: named snapshots of category + tab + view mode + filters
  // + search, persisted in `localStorage`. `useSavedViews` exposes the
  // list + CRUD; the SavedViewsBar renders the load / save / rename /
  // delete UI. Applying a view either mutates in-place (same category)
  // or navigates to the target category — see `handleApplyView` below.
  const savedViewsApi = useSavedViews();

  const dataset = useMemo(() => buildFakeEntities(), []);
  // Narrow the dataset to the active category once, then drive every
  // downstream concern (facets, summary, grid, list, flyout context) off
  // the same slice. Doing the filter here — rather than at each consumer —
  // keeps the rest of the component identical to the un-scoped All
  // entities page.
  const scopedEntities = useMemo(() => {
    let list = categoryScope
      ? dataset.entities.filter((entity) => entity.category === categoryScope)
      : dataset.entities;
    if (cloudProviderScope) {
      list = list.filter((entity) => entity.provider === cloudProviderScope);
    }
    if (cloudProviderScope && cloudServiceScope) {
      const service = getCloudService(cloudProviderScope, cloudServiceScope);
      if (service) {
        list = list.filter((entity) => entity.type === service.entityType);
      }
    }
    return list;
  }, [dataset.entities, categoryScope, cloudProviderScope, cloudServiceScope]);
  // Feed the unified search bar's value autocomplete from the visible slice,
  // so suggestions match the facet dropdowns (e.g. `application:` offers the
  // same app names). ElasticOn-only; no-op otherwise.
  useEntityValueSuggestions(isElasticOn, labDataView, scopedEntities);
  // Tag facets must be computed from the visible slice. If we kept them
  // global, a scoped page would show filter options that always empty the
  // grid (e.g. "Application: ml-platform" on the Databases page when no
  // database is tagged with that application).
  const tagFacets = useMemo(() => getTagFacets(scopedEntities), [scopedEntities]);
  // Entity-type-specific "extra" filters (e.g. Hosts → OS / Cloud provider /
  // Service name). Only surfaced when the inventory is scoped to a category
  // that declares them, and only in ElasticOn.
  const extraFilterDefs = useMemo(
    () => (isElasticOn && categoryScope ? getCategoryExtraFilters(categoryScope) : []),
    [isElasticOn, categoryScope]
  );
  const extraFacets = useMemo(
    () => getExtraFacets(scopedEntities, extraFilterDefs),
    [scopedEntities, extraFilterDefs]
  );
  const [activeExtraFilters, setActiveExtraFilters] =
    useState<ActiveExtraFilters>(EMPTY_EXTRA_FILTERS);
  // Extra filters are category-specific, so clear them when the scope changes
  // to avoid a selection from one category silently narrowing another.
  useEffect(() => {
    setActiveExtraFilters(EMPTY_EXTRA_FILTERS);
  }, [categoryScope, cloudProviderScope, cloudServiceScope]);

  const categoryDescriptor = categoryScope ? getCategoryDescriptor(categoryScope) : undefined;
  // Cloud provider / service descriptors resolved from the scope, used
  // to swap the page header (icon + label) to the provider logo and
  // "AWS · EC2" style breadcrumb label on the nested routes.
  const cloudProvider = cloudProviderScope ? getCloudProvider(cloudProviderScope) : undefined;
  const cloudService =
    cloudProviderScope && cloudServiceScope
      ? getCloudService(cloudProviderScope, cloudServiceScope)
      : undefined;
  const headerIcon = cloudProvider?.icon ?? categoryDescriptor?.icon;
  const headerLabel = cloudService
    ? `${cloudProvider?.label ?? ''} · ${cloudService.label}`
    : cloudProvider?.label ?? categoryDescriptor?.label;
  // Substring the Overview's Data streams block filters on so it reacts
  // to the cloud tree: `aws.` on the provider page, `aws.ec2` on a
  // service page (matches the seeded `metrics-aws.ec2-default` names).
  const cloudStreamMatch = cloudProviderScope
    ? cloudServiceScope
      ? `${cloudProviderScope}.${cloudServiceScope}`
      : `${cloudProviderScope}.`
    : undefined;
  // Discreet, persisted toggle: provider-grouped Cloud vs the flat
  // legacy layout. Only surfaced on the Cloud category + provider pages
  // (a single-service page has nothing to group).
  const [cloudHierarchyEnabled, setCloudHierarchyEnabled] = useCloudHierarchyEnabled();
  const isCloudScoped = categoryScope === 'cloud';
  const showCloudHierarchyToggle = isCloudScoped && !cloudServiceScope;
  const [search, setSearch] = useState('');
  // Tag filters persist across left-nav walks between categories —
  // filtering by "team: payments" on Hosts and then jumping to
  // Kubernetes keeps the same team filter applied, matching what the
  // user expects when they're triaging one team's stack across
  // categories. Search stays local (transient) because a specific-
  // entity query is per-view, not a preference.
  const [activeTagFilters, setActiveTagFilters] = useEntitiesTagFilters();
  const [viewMode, setViewMode] = useEntitiesViewMode();
  // ElasticOn "Group by" (1–2 fields). Non-ElasticOn modes never surface the
  // control, so this stays at the built-in Category → Type default there.
  const [groupBy, setGroupBy] = useEntitiesGroupBy();

  // "Group by" fields offered on this page (core + category-scoped attributes)
  // and the resolved defs for the active selection. `customGroupBy` is only set
  // when ElasticOn and the selection differs from the built-in Category → Type
  // default — that's the signal the grid/list use to switch to the generic,
  // health-coloured layout. A selection whose fields don't resolve on the
  // current page (e.g. a Hosts-only attribute after navigating away) collapses
  // back to the default layout rather than rendering an empty grouping.
  const groupByFields = useMemo(() => getGroupByFields(categoryScope), [categoryScope]);
  const activeGroupByFields = useMemo(
    () => resolveGroupByFields(groupBy, groupByFields),
    [groupBy, groupByFields]
  );
  // `undefined` → built-in Category → Type layout (the rich per-type one).
  // `[]`        → flat / ungrouped (single "All entities" block).
  // `[fields…]` → generic custom grouping.
  const customGroupBy = useMemo<readonly GroupByFieldDef[] | undefined>(() => {
    if (!isElasticOn) return undefined;
    // Explicitly cleared → flat, ungrouped view (not the built-in default).
    if (groupBy.length === 0) return [];
    // The built-in default reproduces the rich Category → Type layout.
    if (isDefaultGroupBy(groupBy)) return undefined;
    // A non-empty selection whose fields don't resolve on this page (e.g. a
    // Hosts-only attribute after walking to Kubernetes) — the intent was to
    // group, so fall back to the built-in layout rather than flattening.
    if (activeGroupByFields.length === 0) return undefined;
    return activeGroupByFields;
  }, [isElasticOn, groupBy, activeGroupByFields]);

  // Pending-search consumption: the `search` string can't ride the
  // persisted-state pipeline (it's per-mount `useState`, not
  // localStorage). When a saved-view apply required navigating between
  // categories, `applyViewToStorage` parked the target search here —
  // read it once on mount, apply it, and clear the slot.
  useEffect(() => {
    const pending = consumePendingSearch();
    if (pending !== null) setSearch(pending);
  }, []);
  // Two flyout slots so the shared flyout's parent/child session can dock two
  // entities side by side: `selectedEntityName` is the parent (session
  // `'start'`), `childEntityName` is the child (session `'inherit'`). The ref
  // mirrors the parent so the stable `openEntity` callback can decide, without
  // re-creating on every selection change, whether a click should open the
  // parent (nothing open yet) or a child (parent already open).
  const [selectedEntityName, setSelectedEntityName] = useState<string | null>(null);
  const [childEntityName, setChildEntityName] = useState<string | null>(null);
  // The health/type the child was opened with when it comes from an in-flyout
  // click (a Dependencies row / topology-map node). Those entities are
  // fabricated by the shared package and rarely live in `dataset`, so the
  // dataset lookup below can't resolve their health — the context carries
  // exactly what the map/table showed so the child stays coherent with it.
  const [childEntityContext, setChildEntityContext] = useState<EntitySelectionContext | null>(null);
  // Category pages get an Overview / Inventory tab strip; the
  // cross-category page shows the same pair on top of the aggregated
  // overview. Overview is the default landing tab (first-time visit)
  // because the alerts / SLOs / data-stream signals it shows are the
  // "what needs my attention" story users want to see before drilling
  // into the raw entity list. After that the choice is persisted so
  // walking the left nav from Kubernetes → Hosts → Databases doesn't
  // silently drop the user back to Overview each time.
  const [categoryTab, setCategoryTab] = useCategoryTab();
  // Overview is the default landing tab on both the per-category pages
  // and the cross-category `/entities` page. On the cross-category page
  // Overview aggregates every category (see `AllEntitiesOverviewView`),
  // so we no longer gate on `categoryScope` here.
  //
  // In Latest the Monitoring/Overview surface is removed entirely, so the
  // page always renders the Inventory surface regardless of the persisted tab.
  const showOverviewTab = !isLatest && categoryTab === 'monitoring';

  // Latest: apply a saved view opened from the left nav. The nav can only link
  // (no click handler), so it encodes the view id in `?loadView=<id>`. We keep
  // that param in the URL (rather than stripping it) so the view stays
  // highlighted in the nav and survives a refresh — the id is the single source
  // of truth for "which view is loaded".
  const { views: savedViewsList } = savedViewsApi;
  const loadViewId = useMemo(
    () => (isLatest ? new URLSearchParams(location.search).get('loadView') : null),
    [isLatest, location.search]
  );
  // Apply each `loadView` id exactly once. The setters below (category tab / tag
  // filters / view mode) already persist to localStorage, so we deliberately do
  // NOT call back into the saved-views store here: doing so re-fired this effect
  // via the store subscription and caused an infinite update loop. The ref guard
  // also prevents re-applying — and clobbering the user's in-progress edits —
  // when the store emits for unrelated reasons (e.g. saving a new view).
  const appliedLoadViewIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLatest || !loadViewId) return;
    if (appliedLoadViewIdRef.current === loadViewId) return;
    const view = savedViewsList.find((candidate) => candidate.id === loadViewId);
    if (!view) return;
    appliedLoadViewIdRef.current = loadViewId;
    setCategoryTab(view.state.tab);
    setActiveTagFilters(view.state.filters);
    setViewMode(view.state.viewMode);
    setSearch(view.state.search);
    setActiveExtraFilters(view.state.extraFilters ?? EMPTY_EXTRA_FILTERS);
    setLabFilters(view.state.queryFilters ?? []);
    setGroupBy([...(view.state.groupBy ?? DEFAULT_GROUP_BY)]);
    // "Store time with view": reset the shared time filter to the captured range.
    if (view.state.storeTime && view.state.timeRange) {
      updateTimeRange({ from: view.state.timeRange.from, to: view.state.timeRange.to });
    }
  }, [
    isLatest,
    loadViewId,
    savedViewsList,
    setActiveTagFilters,
    setCategoryTab,
    setViewMode,
    setGroupBy,
    updateTimeRange,
  ]);

  // Latest: if the loaded view is deleted (e.g. from the nav's "Manage saved
  // views" modal), its id no longer resolves but `?loadView` lingers in the URL.
  // That param is what tells the nav to *suppress* the category highlight (so the
  // saved view highlights instead) — with the view gone, the panel is left with
  // no active item and the highlight falls through to Streams, which reads as
  // being bounced off the inventory page. Strip the stale param so the category
  // re-activates and we stay put. Runs only when the id is truly orphaned, so it
  // never fights an in-progress apply.
  useEffect(() => {
    if (!isLatest || !loadViewId) return;
    if (savedViewsList.some((candidate) => candidate.id === loadViewId)) return;
    const params = new URLSearchParams(location.search);
    params.delete('loadView');
    const nextSearch = params.toString();
    history.replace({ pathname: location.pathname, search: nextSearch ? `?${nextSearch}` : '' });
  }, [isLatest, loadViewId, savedViewsList, history, location.pathname, location.search]);

  // ElasticOn: the first time the Infrastructure landing (`/entities`) is opened
  // in a browser session, redirect to the user's default view (if any). We
  // rewrite the route to the view's exact page + `?loadView` so the existing
  // load effect applies its filters and the nav highlights it — identical to
  // clicking the view in the nav. Gated by a per-session flag so subsequent
  // visits keep the plain "All entities" landing reachable.
  const { defaultViewId } = savedViewsApi;
  useEffect(() => {
    if (!isElasticOn) return;
    // Only the cross-category landing — never a category or cloud sub-page the
    // user navigated to on purpose.
    if (categoryScope !== undefined) return;
    if (loadViewId) return;
    if (!defaultViewId) return;
    if (hasAppliedDefaultThisSession()) return;
    const view = savedViewsList.find((candidate) => candidate.id === defaultViewId);
    // Mark applied even if the default was deleted out from under us, so we don't
    // re-check on every render for the rest of the session.
    markDefaultAppliedThisSession();
    if (!view) return;
    const {
      category: viewCategory,
      cloudProvider: viewProvider,
      cloudService: viewService,
    } = view.state;
    let pathname = '/entities';
    if (viewCategory === 'cloud' && viewProvider && viewService) {
      pathname = `/entities/cloud/${viewProvider}/${viewService}`;
    } else if (viewCategory === 'cloud' && viewProvider) {
      pathname = `/entities/cloud/${viewProvider}`;
    } else if (viewCategory) {
      pathname = `/entities/${viewCategory}`;
    }
    history.replace({ pathname, search: `?loadView=${encodeURIComponent(view.id)}` });
  }, [isElasticOn, categoryScope, loadViewId, defaultViewId, savedViewsList, history]);

  const filteredEntities = useMemo(() => {
    // ElasticOn: `search` holds a KQL expression driven by the unified
    // search bar (reusing the same state slot so saved views keep working).
    // Evaluate it — plus any "+ Add filter" chips — against the entities.
    if (isElasticOn) {
      const predicate = compileEntityKql(search);
      return scopedEntities.filter(
        (entity) =>
          matchesTagFilters(entity, activeTagFilters) &&
          matchesExtraFilters(entity, activeExtraFilters, extraFilterDefs) &&
          predicate(entity) &&
          entityMatchesFilters(labFilters, entity)
      );
    }
    const query = search.trim().toLowerCase();
    return scopedEntities.filter((entity) => {
      if (query && !entity.name.toLowerCase().includes(query)) return false;
      return matchesTagFilters(entity, activeTagFilters);
    });
  }, [
    scopedEntities,
    search,
    activeTagFilters,
    isElasticOn,
    labFilters,
    activeExtraFilters,
    extraFilterDefs,
  ]);

  // ElasticOn summary "· N Groups": count distinct level-1 buckets under the
  // active grouping (Category by default), so the header stays truthful when
  // the user regroups (e.g. by Environment).
  const elasticOnGroupCount = useMemo(() => {
    if (!isElasticOn) return 0;
    // Flat / ungrouped: everything sits in a single "All entities" block.
    if (groupBy.length === 0) return filteredEntities.length > 0 ? 1 : 0;
    const field = activeGroupByFields[0] ?? groupByFields[0];
    if (!field) return 0;
    return new Set(filteredEntities.map((entity) => field.valueOf(entity))).size;
  }, [isElasticOn, groupBy, activeGroupByFields, groupByFields, filteredEntities]);

  // Any filter dimension active (tags, extra facets, "+ Add filter" chips, or a
  // typed KQL query) — drives the unified "Clear filters" affordance below.
  const hasActiveFilters =
    TAG_KEYS.some((key) => activeTagFilters[key].length > 0) ||
    Object.values(activeExtraFilters).some((values) => values.length > 0) ||
    labFilters.length > 0 ||
    search.trim() !== '';

  // Reset every filter dimension in one click (ElasticOn toolbar).
  const handleClearFilters = useCallback(() => {
    setActiveTagFilters(EMPTY_TAG_FILTERS);
    setActiveExtraFilters(EMPTY_EXTRA_FILTERS);
    setLabFilters([]);
    setSearch('');
  }, [setActiveTagFilters]);

  // Resolve the clicked entity's `type` and `health` from the dataset so the
  // shared flyout can pick the right kind template (service / host / pod /
  // node / cluster / namespace / database / cloud / middleware / llm) and the
  // right health variant (healthy / atRisk / unhealthy). When the user keeps
  // navigating from inside the flyout (Dependencies row clicks), the new
  // name may not be in the dataset — in that case both lookups return
  // undefined and the shared package falls back to name-based inference +
  // the `'healthy'` health variant.
  // Built from the *unscoped* dataset so a Dependencies-row click inside
  // the flyout can still resolve type/health for an entity that lives
  // outside the current category page (e.g. a service depending on a pod
  // while the user is on the Services page).
  const entityByName = useMemo(() => {
    type DatasetEntity = (typeof dataset.entities)[number];
    const map = new Map<string, DatasetEntity>();
    for (const entity of dataset.entities) {
      map.set(entity.name, entity);
    }
    return map;
  }, [dataset]);
  const selectedEntity = selectedEntityName ? entityByName.get(selectedEntityName) : undefined;
  const selectedEntityType = selectedEntity?.type;
  const selectedEntityHealth = selectedEntity?.health;
  const selectedEntityRegion = selectedEntity?.tags.region;

  // Prefer the click context (what the map/table showed) so an in-flyout
  // selection opens coherent with it; fall back to the dataset lookup for
  // page-surface clicks (grid / list / geomap / service map) that pass no
  // context but do have a real dataset row.
  const childEntity = childEntityName ? entityByName.get(childEntityName) : undefined;
  const childEntityType = childEntityContext?.entityType ?? childEntity?.type;
  const childEntityHealth = childEntityContext?.health ?? childEntity?.health;
  const childEntityRegion = childEntityContext?.region ?? childEntity?.tags.region;

  // Honours the per-entity-type enablement switch in "Manage entity types":
  // when the resolved type is disabled, opening is silently declined. Read
  // synchronously (not via the hook) so the gate stays in sync without
  // re-creating callbacks on every store change.
  const isEntityOpenable = useCallback(
    (entityName: string) => {
      const matched = entityByName.get(entityName);
      const entityTypeId = resolveEntityTypeIdForName(entityName, matched?.type);
      return isEntityTypeEnabled(entityTypeId);
    },
    [entityByName]
  );

  /**
   * Single funnel for every entity-name click on the page surface (grid
   * tile, list row, geomap donut, service-map node). These have no
   * parent/child relationship, so each click just *replaces* the single
   * open flyout (and tears down any child from a previous in-flyout
   * navigation). Child flyouts are opened only from *inside* a flyout via
   * {@link openChildEntity}.
   */
  const openEntity = useCallback(
    (entityName: string) => {
      if (!isEntityOpenable(entityName)) return;
      setSelectedEntityName(entityName);
      setChildEntityName(null);
      setChildEntityContext(null);
    },
    [isEntityOpenable]
  );

  // Selecting an entity from *inside* a flyout (Dependencies row, etc.)
  // always targets the child slot, so the parent stays pinned and the
  // child either opens or navigates to the new entity.
  const openChildEntity = useCallback(
    (entityName: string, context?: EntitySelectionContext) => {
      if (!isEntityOpenable(entityName)) return;
      setChildEntityName(entityName);
      setChildEntityContext(context ?? null);
    },
    [isEntityOpenable]
  );

  // Closing the parent tears the whole session down (the child can't
  // outlive its parent); closing the child leaves the parent open.
  const closeEntity = useCallback(() => {
    setSelectedEntityName(null);
    setChildEntityName(null);
    setChildEntityContext(null);
  }, []);
  const closeChildEntity = useCallback(() => {
    setChildEntityName(null);
    setChildEntityContext(null);
  }, []);

  // Clicking a region on the Geomap toggles that region into the shared
  // `region` tag filter — same state the filter chips drive — so the
  // whole page (map + list) narrows to it. Clicking the already-sole
  // region clears the filter again.
  const handleSelectRegion = useCallback(
    (region: string) => {
      setActiveTagFilters((prev) => {
        const isSoleActive = prev.region.length === 1 && prev.region[0] === region;
        return { ...prev, region: isSoleActive ? [] : [region] };
      });
    },
    [setActiveTagFilters]
  );

  // Resolve the canonical kind for an entity, then map that to the
  // `FakeEntityType.id` of the corresponding row in "Manage entity types"
  // so the cog can deep-link to its edit form. Prefer the exact row whose
  // `name` matches the entity's `.type` (e.g. `Bare-metal` →
  // `bare-metal-host`); fall back to the kind-level mapping for
  // legacy / inferred-only kinds, and to the cross-category list when
  // neither lookup yields a hit. Shared by the parent and child flyouts.
  const manageEntityType = useCallback(
    (entity: Entity | undefined) => {
      if (!entity) {
        router.push('/manage-entity-types', { path: {}, query: {} });
        return;
      }
      const kind: EntityKind | undefined =
        entityTypeToKind(entity.type) ?? inferEntityKind(entity.name);
      const editId =
        findEntityTypeIdByName(entity.type) ??
        (kind ? KIND_TO_FALLBACK_ENTITY_TYPE_ID[kind] : undefined);
      router.push('/manage-entity-types', {
        path: {},
        query: editId ? { edit: editId } : {},
      });
    },
    [router]
  );

  // Kubernetes resources (pod, node, namespace, cluster, deployment) embed
  // their matching "[Kubernetes OTel] … Detail" dashboard in the flyout's
  // Overview tab, scoped to the clicked resource. The shared flyout package
  // can't depend on the `dashboard` plugin, so Streams injects the renderer
  // here; kinds without a matching dashboard return `null` and the Overview
  // tab renders as before. Time range follows the page's picker.
  const renderEntityDashboard = useCallback(
    ({ entityName, entityType, kind }: EntityDashboardRenderContext) => {
      const resolvedKind = kind ?? entityTypeToKind(entityType) ?? inferEntityKind(entityName);
      const dashboardConfig = getK8sDetailDashboardConfig(resolvedKind);
      if (!dashboardConfig) return null;
      return (
        <K8sDetailDashboard
          config={dashboardConfig}
          resourceName={entityName}
          rangeFrom={rangeFrom}
          rangeTo={rangeTo}
        />
      );
    },
    [rangeFrom, rangeTo]
  );

  // `agentBuilder` is an *optional* start dep on Streams — when it's
  // available (most environments) the shared flyout's "Add to chat"
  // footer button lights up and the entity context is forwarded to the
  // AI chat with the same payload Discover uses. When it's missing the
  // button is hidden and the rest of the flyout keeps working.
  const flyoutServices = useMemo(
    () => ({ agentBuilder, notifications, charts, renderEntityDashboard }),
    [agentBuilder, notifications, charts, renderEntityDashboard]
  );

  // Latest: the view currently loaded from the nav (`?loadView=<id>`), if it
  // still resolves. Drives the Save button's "update vs save-as-new" choice and
  // the "Unsaved changes" badge.
  const loadedView = useMemo(
    () => (loadViewId ? savedViewsList.find((view) => view.id === loadViewId) : undefined),
    [loadViewId, savedViewsList]
  );

  // Snapshot of everything that makes up a "view" — feeds both the
  // "Modified" indicator and the payload written when the user hits
  // Save / Update. `null` category is the cross-category page.
  const currentViewState = useMemo<SavedViewState>(
    () => ({
      category: categoryScope ?? null,
      // Capture the cloud sub-scope so a view saved on e.g. `/entities/cloud/
      // aws/s3` reloads that exact page rather than the whole Cloud category.
      cloudProvider: cloudProviderScope ?? null,
      cloudService: cloudServiceScope ?? null,
      tab: categoryTab,
      viewMode,
      search,
      filters: activeTagFilters,
      // ElasticOn-only dimensions (empty elsewhere) — tracked so the
      // "Unsaved changes" badge lights when they change and Save/Update
      // persists them.
      extraFilters: activeExtraFilters,
      queryFilters: labFilters,
      // "Store time with view" is a per-view preference, so mirror the loaded
      // view's flag. When it's on, the live time range is part of the snapshot
      // (so changing the picker lights the "Unsaved changes" badge); when off,
      // time is left out of the comparison entirely.
      storeTime: loadedView?.state.storeTime ?? false,
      timeRange: loadedView?.state.storeTime ? { from: rangeFrom, to: rangeTo } : undefined,
      // ElasticOn "Group by" — tracked so the "Unsaved changes" badge lights on
      // change and Save/Update persists the grouping.
      groupBy,
    }),
    [
      categoryScope,
      cloudProviderScope,
      cloudServiceScope,
      categoryTab,
      viewMode,
      search,
      activeTagFilters,
      activeExtraFilters,
      labFilters,
      loadedView,
      rangeFrom,
      rangeTo,
      groupBy,
    ]
  );

  const isLoadedViewModified = loadedView
    ? !areStatesEqual(loadedView.state, currentViewState)
    : false;

  // Fold the "Store time with view" choice into the state written on Save /
  // Update: capture the live time range when on, strip it when off.
  const withStoredTime = useCallback(
    (state: SavedViewState, storeTime: boolean): SavedViewState =>
      storeTime
        ? { ...state, storeTime: true, timeRange: { from: rangeFrom, to: rangeTo } }
        : { ...state, storeTime: false, timeRange: undefined },
    [rangeFrom, rangeTo]
  );

  // Update the loaded view in place with the current on-page state. Stays on the
  // same view (URL keeps its `?loadView`); the store change clears the badge.
  const handleUpdateLoadedView = useCallback(
    (state: SavedViewState, makeDefault: boolean, storeTime: boolean) => {
      if (!loadedView) return;
      savedViewsApi.updateViewState(loadedView.id, withStoredTime(state, storeTime));
      // Reflect the "Set as default" toggle: promote to default when checked,
      // and demote when unchecked but this view was the standing default. Leave
      // an unrelated default untouched.
      if (makeDefault) {
        savedViewsApi.setDefaultView(loadedView.id);
      } else if (savedViewsApi.defaultViewId === loadedView.id) {
        savedViewsApi.setDefaultView(null);
      }
    },
    [loadedView, savedViewsApi, withStoredTime]
  );

  // Save the current state as a brand-new view, then switch to it: point the URL
  // at the new id so it becomes the loaded view (and highlights in the nav). The
  // new view's category is the current category, so only the query changes.
  const handleSaveAsNewView = useCallback(
    (name: string, state: SavedViewState, makeDefault: boolean, storeTime: boolean) => {
      const view = savedViewsApi.saveView(name, withStoredTime(state, storeTime));
      if (makeDefault) savedViewsApi.setDefaultView(view.id);
      const params = new URLSearchParams(location.search);
      params.set('loadView', view.id);
      history.push({ pathname: location.pathname, search: `?${params.toString()}` });
    },
    [savedViewsApi, history, location.pathname, location.search, withStoredTime]
  );

  // Apply a saved view. Two flows:
  //   1. Same category  — mutate this mount's state in place and update
  //                        localStorage (via `applyViewToStorage`) so a
  //                        later remount hydrates from the same values.
  //   2. Different cat. — `applyViewToStorage` writes every persisted
  //                        slot synchronously (dodging the batched-setState
  //                        vs. router-unmount race), then we navigate.
  //                        The destination mount reads from localStorage
  //                        and consumes the parked search string.
  const handleApplyView = useCallback(
    (view: SavedView) => {
      applyViewToStorage(view);
      const targetCategory = view.state.category ?? null;
      const targetProvider = view.state.cloudProvider ?? null;
      const targetService = view.state.cloudService ?? null;
      const sourceCategory = categoryScope ?? null;
      const sourceProvider = cloudProviderScope ?? null;
      const sourceService = cloudServiceScope ?? null;
      // The full route identity includes the cloud sub-scope — otherwise a jump
      // between two cloud services (both `category: 'cloud'`) would be treated as
      // "same route" and never navigate.
      const isSameRoute =
        sourceCategory === targetCategory &&
        sourceProvider === targetProvider &&
        sourceService === targetService;
      if (isSameRoute) {
        // Same route → keep the mount, but sync in-memory state so the
        // UI updates without waiting for a remount. Also clear the
        // pending-search slot we just wrote — no navigation means no
        // destination mount to consume it.
        setCategoryTab(view.state.tab);
        setActiveTagFilters(view.state.filters);
        setViewMode(view.state.viewMode);
        setSearch(view.state.search);
        setActiveExtraFilters(view.state.extraFilters ?? EMPTY_EXTRA_FILTERS);
        setLabFilters(view.state.queryFilters ?? []);
        setGroupBy([...(view.state.groupBy ?? DEFAULT_GROUP_BY)]);
        if (view.state.storeTime && view.state.timeRange) {
          updateTimeRange({ from: view.state.timeRange.from, to: view.state.timeRange.to });
        }
        consumePendingSearch();
        return;
      }
      if (targetCategory === null) {
        router.push('/entities', { path: {}, query: {} });
      } else if (targetCategory === 'cloud' && targetProvider && targetService) {
        router.push('/entities/cloud/{provider}/{service}', {
          path: { provider: targetProvider, service: targetService },
          query: {},
        });
      } else if (targetCategory === 'cloud' && targetProvider) {
        router.push('/entities/cloud/{provider}', {
          path: { provider: targetProvider },
          query: {},
        });
      } else {
        router.push('/entities/{category}', {
          path: { category: targetCategory },
          query: {},
        });
      }
    },
    [
      categoryScope,
      cloudProviderScope,
      cloudServiceScope,
      router,
      setActiveTagFilters,
      setCategoryTab,
      setViewMode,
      setGroupBy,
      updateTimeRange,
    ]
  );

  // ElasticOn drops the Geomap view mode. Hide its toggle option and, if a
  // previously-persisted `geomap` selection is still around, fall back to the
  // grid so the body doesn't render an unavailable view.
  const viewModeOptions = isElasticOn
    ? VIEW_MODE_OPTIONS.filter((option) => option.id !== 'geomap')
    : VIEW_MODE_OPTIONS;
  const effectiveViewMode: ViewMode = isElasticOn && viewMode === 'geomap' ? 'grid' : viewMode;

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {headerIcon ? (
              <EuiFlexItem grow={false}>
                <EuiIcon type={headerIcon} size="l" aria-hidden />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              {/*
                Titles intentionally omit an entity count — the Inventory
                tab label already renders "Inventory ({count})" for both
                the per-category and cross-category pages, so duplicating
                it in the page title just noise.
              */}
              {headerLabel
                ? headerLabel
                : i18n.translate('xpack.streams.entityCentricLab.entities.title', {
                    defaultMessage: 'All entities',
                  })}
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiBetaBadge
                label={i18n.translate('xpack.streams.entityCentricLab.entities.labBadge', {
                  defaultMessage: 'Lab',
                })}
                size="s"
                color="hollow"
              />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
        tabs={
          // Latest drops the Inventory/Monitoring tab strip entirely — the
          // Monitoring assets surface is gone, so there's only the Inventory
          // surface below and nothing to switch between. Every other mode keeps
          // the two tabs unchanged.
          isLatest
            ? undefined
            : [
                {
                  label: i18n.translate('xpack.streams.entityCentricLab.entities.tabs.inventory', {
                    defaultMessage: 'Inventory ({count})',
                    // Cross-category inventory covers the full dataset; per-
                    // category inventory is scoped to the current category.
                    // The button count reflects the same set the tab body
                    // renders, so `scopedEntities` is the right source either
                    // way.
                    values: { count: scopedEntities.length.toLocaleString() },
                  }),
                  isSelected: categoryTab === 'inventory',
                  onClick: () => setCategoryTab('inventory'),
                  'data-test-subj': 'entityCentricLabInventoryTab',
                },
                {
                  label: i18n.translate(
                    'xpack.streams.entityCentricLab.entities.tabs.monitoringAssets',
                    {
                      defaultMessage: 'Monitoring',
                    }
                  ),
                  isSelected: categoryTab === 'monitoring',
                  onClick: () => setCategoryTab('monitoring'),
                  'data-test-subj': 'entityCentricLabMonitoringAssetsTab',
                },
              ]
        }
        rightSideItems={
          isInfraShortTerm
            ? []
            : [
                <EuiButton
                  key="manage"
                  iconType="gear"
                  size={isElasticOn ? 's' : 'm'}
                  color={isElasticOn ? 'text' : 'primary'}
                  onClick={() => {
                    router.push('/manage-entity-types', { path: {}, query: {} });
                  }}
                  data-test-subj="entityCentricLabManageEntityTypesButton"
                >
                  {i18n.translate('xpack.streams.entityCentricLab.entities.manageButton', {
                    defaultMessage: 'Manage entity types',
                  })}
                </EuiButton>,
              ]
        }
      />
      <StreamsAppPageTemplate.Body>
        <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false}>
          {isCloudScoped && !isLatest ? (
            <EuiFlexItem grow={false} css={CLOUD_SIDE_NAV_COLUMN}>
              <CloudSideNav providerScope={cloudProviderScope} serviceScope={cloudServiceScope} />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem>
            {showOverviewTab ? (
              categoryScope ? (
                <MonitoringAssetsView
                  category={categoryScope}
                  onSelectEntity={openEntity}
                  scopeLabel={cloudProviderScope ? headerLabel : undefined}
                  dataStreamNameIncludes={cloudStreamMatch}
                />
              ) : (
                <AllEntitiesOverviewView onSelectEntity={openEntity} />
              )
            ) : isElasticOn ? (
              <>
                {/*
                  ElasticOn Inventory toolbar (3 rows):
                    1. Unified KQL search bar — the same "multidimensional
                       filter" used on Hosts / Infrastructure inventory (query
                       + "+ Add filter" + time range + auto-refresh). There's
                       no backing index, so the KQL / filters are evaluated
                       in-memory against the seeded entities (see entity_kql).
                       `search` doubles as the query string so saved views keep
                       working unchanged.
                    2. Independent facet filters (region, environment, …).
                    3. Summary + Group-by-provider + view-mode toggle + Save view.
                */}
                <div css={NO_GROW}>
                  <unifiedSearch.ui.SearchBar
                    appName="streamsApp"
                    indexPatterns={labDataView ? [labDataView] : []}
                    showQueryInput
                    showQueryMenu
                    showFilterBar
                    showDatePicker
                    isAutoRefreshDisabled={false}
                    displayStyle="inPage"
                    query={{ query: search, language: 'kuery' } as Query}
                    filters={labFilters}
                    dateRangeFrom={rangeFrom}
                    dateRangeTo={rangeTo}
                    onQuerySubmit={(payload, isUpdate) => {
                      const nextQuery = payload.query?.query;
                      setSearch(typeof nextQuery === 'string' ? nextQuery : '');
                      if (payload.dateRange) {
                        handleTimeChange({
                          start: payload.dateRange.from,
                          end: payload.dateRange.to,
                        });
                      }
                      if (!isUpdate) handleLiveRefresh();
                    }}
                    onFiltersUpdated={setLabFilters}
                    onRefresh={handleLiveRefresh}
                    placeholder={i18n.translate(
                      'xpack.streams.entityCentricLab.entities.searchBarPlaceholder',
                      {
                        defaultMessage:
                          'Search entities — e.g. health:unhealthy AND environment:production',
                      }
                    )}
                  />
                </div>
                <EuiSpacer size="s" />
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={NO_GROW}>
                  <EuiFlexItem grow={false}>
                    <EntitiesTagFilters
                      facets={tagFacets}
                      activeFilters={activeTagFilters}
                      onChange={setActiveTagFilters}
                      compressed
                      hideClear
                    />
                  </EuiFlexItem>
                  {extraFilterDefs.length > 0 ? (
                    <EuiFlexItem grow={false}>
                      <EntityExtraFilters
                        defs={extraFilterDefs}
                        facets={extraFacets}
                        activeFilters={activeExtraFilters}
                        onChange={setActiveExtraFilters}
                        compressed
                      />
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem grow={false}>
                    <EntityGroupByControls
                      fields={groupByFields}
                      groupBy={groupBy}
                      onChange={setGroupBy}
                      compressed
                    />
                  </EuiFlexItem>
                  {hasActiveFilters ? (
                    <EuiFlexItem grow={false}>
                      <EuiButtonEmpty
                        size="xs"
                        flush="left"
                        iconType="cross"
                        onClick={handleClearFilters}
                        data-test-subj="entityCentricLabClearFilters"
                      >
                        {i18n.translate('xpack.streams.entityCentricLab.entities.clearFilters', {
                          defaultMessage: 'Clear filters',
                        })}
                      </EuiButtonEmpty>
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="m"
                  responsive={false}
                  wrap
                  css={NO_GROW}
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <h3>
                        {i18n.translate('xpack.streams.entityCentricLab.entities.summary', {
                          defaultMessage: '{entities} Entities · {groups} Groups',
                          values: {
                            entities: filteredEntities.length.toLocaleString(),
                            groups: isElasticOn
                              ? elasticOnGroupCount
                              : categoryScope
                              ? filteredEntities.length > 0
                                ? 1
                                : 0
                              : dataset.totalGroups,
                          },
                        })}
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem />
                  <EuiFlexItem grow={false}>
                    <EuiButtonGroup
                      legend={i18n.translate(
                        'xpack.streams.entityCentricLab.entities.viewMode.legend',
                        { defaultMessage: 'View mode' }
                      )}
                      options={viewModeOptions}
                      idSelected={effectiveViewMode}
                      onChange={(id) => setViewMode(id as ViewMode)}
                      isIconOnly
                      buttonSize="compressed"
                      color="text"
                      data-test-subj="entityCentricLabEntitiesViewModeToggle"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <SaveViewButton
                      currentState={currentViewState}
                      loadedView={loadedView}
                      isModified={isLoadedViewModified}
                      onUpdate={handleUpdateLoadedView}
                      onSaveAsNew={handleSaveAsNewView}
                      showMakeDefault={isElasticOn}
                      isLoadedViewDefault={
                        Boolean(loadedView) && savedViewsApi.defaultViewId === loadedView?.id
                      }
                      compact
                      neutral
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiCopy
                      textToCopy={typeof window !== 'undefined' ? window.location.href : ''}
                      beforeMessage={i18n.translate(
                        'xpack.streams.entityCentricLab.entities.copyUrl.tooltip',
                        { defaultMessage: 'Copy a link to this view to share' }
                      )}
                      afterMessage={i18n.translate(
                        'xpack.streams.entityCentricLab.entities.copyUrl.copied',
                        { defaultMessage: 'Copied' }
                      )}
                    >
                      {(copy) => (
                        <EuiButton
                          size="s"
                          color="text"
                          iconType="link"
                          onClick={copy}
                          data-test-subj="entityCentricLabCopyUrlButton"
                        >
                          {i18n.translate('xpack.streams.entityCentricLab.entities.copyUrl.label', {
                            defaultMessage: 'Copy URL',
                          })}
                        </EuiButton>
                      )}
                    </EuiCopy>
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiHorizontalRule margin="m" />
                {effectiveViewMode === 'grid' ? (
                  <GroupedGridView
                    entities={filteredEntities}
                    onSelectEntity={openEntity}
                    selectedEntityName={selectedEntityName}
                    groupCloudByProvider={false}
                    enablePaletteColoring={isElasticOn}
                    refreshTick={refreshTick}
                    customGroupBy={customGroupBy}
                  />
                ) : (
                  <EntitiesListView
                    entities={filteredEntities}
                    onSelectEntity={openEntity}
                    groupCloudByProvider={false}
                    enableColumnSettings={isElasticOn}
                    refreshTick={refreshTick}
                    customGroupBy={customGroupBy}
                  />
                )}
              </>
            ) : (
              <>
                {/*
              Saved views: a compact toolbar row above the search/filters
              row. Lets the user snapshot the current category + tab +
              view mode + tag filters + search under a name, and re-load
              it later (potentially on a different category, in which
              case the apply handler routes to the target page).

              Latest relocates this list into the left nav (a "Saved views"
              section), so it renders only the compact "Save view" button in
              the filters row below instead of this full bar.
            */}
                {isLatest ? null : (
                  <>
                    <SavedViewsBar
                      currentState={currentViewState}
                      onApplyView={handleApplyView}
                      savedViews={savedViewsApi}
                    />
                    <EuiSpacer size="s" />
                  </>
                )}
                {/*
          Search, tag filters and time picker share one row to keep the
          page top compact. `NO_GROW` is applied to the wrapper so the row
          stays at content height when the body shrinks (same trick as the
          toolbar below — see the `NO_GROW` definition for the rationale).
        */}
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} css={NO_GROW}>
                  <EuiFlexItem>
                    <EuiFieldSearch
                      fullWidth
                      incremental
                      placeholder={i18n.translate(
                        'xpack.streams.entityCentricLab.entities.searchPlaceholder',
                        { defaultMessage: 'Filter entities by name' }
                      )}
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      data-test-subj="entityCentricLabEntitiesSearch"
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EntitiesTagFilters
                      facets={tagFacets}
                      activeFilters={activeTagFilters}
                      onChange={setActiveTagFilters}
                    />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiSuperDatePicker
                      start={rangeFrom}
                      end={rangeTo}
                      onTimeChange={handleTimeChange}
                      onRefresh={handleTimeRefresh}
                      showUpdateButton="iconOnly"
                      width="auto"
                      data-test-subj="entityCentricLabEntitiesTimePicker"
                    />
                  </EuiFlexItem>
                  {isLatest ? (
                    <EuiFlexItem grow={false}>
                      {/*
                        Latest: the saved-views list lives in the left nav, so
                        the toolbar only carries the save action. When a view is
                        loaded, Save offers to update it or fork a new one; the
                        new/updated view shows up under "Saved views" in the nav
                        (same localStorage store).
                      */}
                      <SaveViewButton
                        currentState={currentViewState}
                        loadedView={loadedView}
                        isModified={isLoadedViewModified}
                        onUpdate={handleUpdateLoadedView}
                        onSaveAsNew={handleSaveAsNewView}
                        showMakeDefault={isElasticOn}
                        isLoadedViewDefault={
                          Boolean(loadedView) && savedViewsApi.defaultViewId === loadedView?.id
                        }
                      />
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
                <EuiSpacer size="m" />
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="m"
                  responsive={false}
                  wrap
                  css={NO_GROW}
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <h3>
                        {i18n.translate('xpack.streams.entityCentricLab.entities.summary', {
                          defaultMessage: '{entities} Entities · {groups} Groups',
                          values: {
                            entities: filteredEntities.length.toLocaleString(),
                            // On the cross-category page the dataset-wide group
                            // total is the right summary. When scoped to one
                            // category the grid only ever renders that single
                            // section, so collapse the count to 1 (or 0 if the
                            // category is empty).
                            groups: categoryScope
                              ? filteredEntities.length > 0
                                ? 1
                                : 0
                              : dataset.totalGroups,
                          },
                        })}
                      </h3>
                    </EuiTitle>
                  </EuiFlexItem>
                  <EuiFlexItem />
                  {showCloudHierarchyToggle ? (
                    <EuiFlexItem grow={false}>
                      <EuiSwitch
                        compressed
                        label={i18n.translate(
                          'xpack.streams.entityCentricLab.entities.cloudHierarchyToggle',
                          { defaultMessage: 'Group by provider' }
                        )}
                        checked={cloudHierarchyEnabled}
                        onChange={(event) => setCloudHierarchyEnabled(event.target.checked)}
                        data-test-subj="entityCentricLabCloudHierarchyToggle"
                      />
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem grow={false}>
                    <EuiButtonGroup
                      legend={i18n.translate(
                        'xpack.streams.entityCentricLab.entities.viewMode.legend',
                        {
                          defaultMessage: 'View mode',
                        }
                      )}
                      options={viewModeOptions}
                      idSelected={effectiveViewMode}
                      onChange={(id) => setViewMode(id as ViewMode)}
                      isIconOnly
                      data-test-subj="entityCentricLabEntitiesViewModeToggle"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiHorizontalRule margin="m" />
                {effectiveViewMode === 'grid' ? (
                  <GroupedGridView
                    entities={filteredEntities}
                    onSelectEntity={openEntity}
                    selectedEntityName={selectedEntityName}
                    groupCloudByProvider={cloudHierarchyEnabled}
                    enablePaletteColoring={isElasticOn}
                    refreshTick={refreshTick}
                  />
                ) : effectiveViewMode === 'geomap' ? (
                  <GeomapView
                    entities={filteredEntities}
                    onSelectEntity={openEntity}
                    onSelectRegion={handleSelectRegion}
                  />
                ) : (
                  <EntitiesListView
                    entities={filteredEntities}
                    onSelectEntity={openEntity}
                    groupCloudByProvider={cloudHierarchyEnabled}
                  />
                )}
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </StreamsAppPageTemplate.Body>
      {selectedEntityName ? (
        <EntityFlyoutServicesProvider services={flyoutServices}>
          <EntityFlyout
            session="start"
            size="m"
            entityName={selectedEntityName}
            entityType={selectedEntityType}
            entityHealth={selectedEntityHealth}
            region={selectedEntityRegion}
            onClose={closeEntity}
            onSelectEntity={openChildEntity}
            onNavigateEntity={openEntity}
            onManageEntityType={
              isInfraShortTerm ? undefined : () => manageEntityType(selectedEntity)
            }
            minimalTabs={isInfraShortTerm}
          />
          {childEntityName ? (
            <EntityFlyout
              session="inherit"
              size="fill"
              entityName={childEntityName}
              entityType={childEntityType}
              entityHealth={childEntityHealth}
              region={childEntityRegion}
              onClose={closeChildEntity}
              onSelectEntity={openChildEntity}
              onNavigateEntity={openChildEntity}
              onManageEntityType={
                isInfraShortTerm ? undefined : () => manageEntityType(childEntity)
              }
              minimalTabs={isInfraShortTerm}
            />
          ) : null}
        </EntityFlyoutServicesProvider>
      ) : null}
    </>
  );
};
