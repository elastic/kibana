/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import useObservable from 'react-use/lib/useObservable';
import {
  EuiBetaBadge,
  EuiButton,
  EuiButtonGroup,
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
import type { ActiveTagFilters, Entity, EntityCategoryId } from './fake_entities';
import { getCloudProvider, getCloudService, type CloudProviderId } from './cloud_providers';
import { useCloudHierarchyEnabled } from './use_cloud_hierarchy';
import {
  EMPTY_TAG_FILTERS,
  TAG_KEYS,
  buildFakeEntities,
  getCategoryDescriptor,
  getTagFacets,
  matchesTagFilters,
} from './fake_entities';
import { GroupedGridView } from './grouped_grid_view';
import { CloudSideNav } from './cloud_side_nav';
import { EntitiesListView } from './entities_list_view';
import { GeomapView } from './geomap_view';
import { EntitiesTagFilters } from './entities_tag_filters';
import { AllEntitiesOverviewView } from './all_entities_overview_view';
import { MonitoringAssetsView } from './monitoring_assets_view';
import { SavedViewsBar } from './saved_views_bar';
import {
  applyViewToStorage,
  consumePendingSearch,
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
  const {
    core: { notifications, uiSettings },
    dependencies: {
      start: { agentBuilder, charts },
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
  // Tag facets must be computed from the visible slice. If we kept them
  // global, a scoped page would show filter options that always empty the
  // grid (e.g. "Application: ml-platform" on the Databases page when no
  // database is tagged with that application).
  const tagFacets = useMemo(() => getTagFacets(scopedEntities), [scopedEntities]);
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
  const showOverviewTab = categoryTab === 'monitoring';

  const filteredEntities = useMemo(() => {
    const query = search.trim().toLowerCase();
    return scopedEntities.filter((entity) => {
      if (query && !entity.name.toLowerCase().includes(query)) return false;
      return matchesTagFilters(entity, activeTagFilters);
    });
  }, [scopedEntities, search, activeTagFilters]);

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

  // Snapshot of everything that makes up a "view" — feeds both the
  // "Modified" indicator and the payload written when the user hits
  // Save / Update. `null` category is the cross-category page.
  const currentViewState = useMemo<SavedViewState>(
    () => ({
      category: categoryScope ?? null,
      tab: categoryTab,
      viewMode,
      search,
      filters: activeTagFilters,
    }),
    [categoryScope, categoryTab, viewMode, search, activeTagFilters]
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
      const sourceCategory = categoryScope ?? null;
      if (sourceCategory === targetCategory) {
        // Same route → keep the mount, but sync in-memory state so the
        // UI updates without waiting for a remount. Also clear the
        // pending-search slot we just wrote — no navigation means no
        // destination mount to consume it.
        setCategoryTab(view.state.tab);
        setActiveTagFilters(view.state.filters);
        setViewMode(view.state.viewMode);
        setSearch(view.state.search);
        consumePendingSearch();
        return;
      }
      if (targetCategory === null) {
        router.push('/entities', { path: {}, query: {} });
      } else {
        router.push('/entities/{category}', {
          path: { category: targetCategory },
          query: {},
        });
      }
    },
    [categoryScope, router, setActiveTagFilters, setCategoryTab, setViewMode]
  );

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
        tabs={[
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
            label: i18n.translate('xpack.streams.entityCentricLab.entities.tabs.monitoringAssets', {
              defaultMessage: 'Monitoring',
            }),
            isSelected: categoryTab === 'monitoring',
            onClick: () => setCategoryTab('monitoring'),
            'data-test-subj': 'entityCentricLabMonitoringAssetsTab',
          },
        ]}
        rightSideItems={
          isInfraShortTerm
            ? []
            : [
                <EuiButton
                  key="manage"
                  iconType="gear"
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
          {isCloudScoped ? (
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
            ) : (
              <>
                {/*
              Saved views: a compact toolbar row above the search/filters
              row. Lets the user snapshot the current category + tab +
              view mode + tag filters + search under a name, and re-load
              it later (potentially on a different category, in which
              case the apply handler routes to the target page).
            */}
                <SavedViewsBar
                  currentState={currentViewState}
                  onApplyView={handleApplyView}
                  savedViews={savedViewsApi}
                />
                <EuiSpacer size="s" />
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
                      options={VIEW_MODE_OPTIONS}
                      idSelected={viewMode}
                      onChange={(id) => setViewMode(id as ViewMode)}
                      isIconOnly
                      data-test-subj="entityCentricLabEntitiesViewModeToggle"
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiHorizontalRule margin="m" />
                {viewMode === 'grid' ? (
                  <GroupedGridView
                    entities={filteredEntities}
                    onSelectEntity={openEntity}
                    selectedEntityName={selectedEntityName}
                    groupCloudByProvider={cloudHierarchyEnabled}
                  />
                ) : viewMode === 'geomap' ? (
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
