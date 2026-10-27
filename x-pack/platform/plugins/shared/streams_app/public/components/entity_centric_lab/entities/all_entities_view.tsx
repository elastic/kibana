/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useHistory, useLocation } from 'react-router-dom';
import useObservable from 'react-use/lib/useObservable';
import type { Filter, Query } from '@kbn/es-query';
import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiButtonIcon,
  EuiCallOut,
  EuiComboBox,
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFieldSearch,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiPopover,
  EuiSpacer,
  EuiSuperDatePicker,
  EuiSwitch,
  EuiText,
  EuiTitle,
  EuiTourStep,
  EuiEmptyPrompt,
  EuiLink,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import moment from 'moment';
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



const k8sFilterGroupCss = css`
  gap: 4px;
`;

/** Sentinel for the top-level category filter ("All categories"). */
const CATEGORY_FILTER_ALL = '__all_categories__';


import {
  EntityFlyout,
  EntityFlyoutServicesProvider,
  alertRowToStableRuleUuid,
  entityTypeToKind,
  inferEntityKind,
  isEntityTypeEnabled,
  resolveEntityTypeIdForName,
  type EntityKind,
  type EntitySelectionContext,
} from '@kbn/entity-centric-lab-flyout';
import { FAKE_ENTITY_TYPES } from '../fake_entity_types';
import { K8sDetailDashboard } from './k8s_detail_dashboard';

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
import datemath from '@kbn/datemath';
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
  getVisibleTagKeys,
  buildFakeEntities,
  getCategoryDescriptor,
  getCategoryExtraFilters,
  getExtraFacets,
  getTagFacets,
  getVisibleEntityCategories,
  isCategoryHiddenInElasticOn,
  isElasticOnDefaultEmptyCategory,
  matchesExtraFilters,
  matchesTagFilters,
} from './fake_entities';
import { podPhaseBadgeForEntity } from './bucket_metrics';
import { GroupedGridView } from './grouped_grid_view';
// CloudSideNav removed — cloud entities now live under functional categories.
import { EntitiesListView } from './entities_list_view';
import { GeomapView } from './geomap_view';
import { EntitiesTagFilters } from './entities_tag_filters';
import { EntityExtraFilters } from './entity_extra_filters';
import {
  ALERTS_FILTER_ALL,
  ALERTS_FILTER_QUERY_PARAM,
  EntityAlertsFilter,
  matchesAlertsFilter,
  parseAlertsFilterFromSearch,
  type AlertsFilterId,
} from './entity_alerts_filter';
import { InventorySummaryCards } from './inventory_summary_cards';
import { EntityGroupByControls } from './entity_group_by_controls';
import { labThing, labThings, labThingsLabel } from '../lab_terminology';
import { VariationProvider, useVariation, useVariationContext } from './variation_context';
import { VariationSwitcher } from './variation_switcher';
import type { DataVariation, DetailVariation, TableStyleVariation } from './variation_registry';
import emptyStateIllustration from './assets/empty_state_illustration.png';
import addDataPageImage from './assets/add_data_page.png';
import { OldExperiencePage, consumeTourFlag } from './transition_modal';
import { SecurityGroupingView } from './security_grouping_view';
import {
  DEFAULT_GROUP_BY,
  getGroupByFields,
  isDefaultGroupBy,
  resolveGroupByFields,
  type GroupByFieldDef,
  type GroupByFieldId,
} from './entity_group_by';
import {
  KUBERNETES_FILTER_ALL,
  KUBERNETES_RESOURCE_TYPE_ALL,
  KubernetesClusterFilter,
  KubernetesDeploymentFilter,
  KubernetesNamespaceFilter,
  KubernetesNodeFilter,
  KubernetesResourceTypeFilter,
  assignClusterForEntity,
  filterEntitiesByResourceType,
  filterKubernetesEntities,
  getKubernetesClusterNames,
  getKubernetesDeploymentNames,
  getKubernetesNamespaceNames,
  getKubernetesNodeNames,
  resourceTypeFilterVisibility,
  CATEGORY_RESOURCE_TYPE_ALL,
  CategoryResourceTypeFilter,
  getEntityTypeLabels,
  filterEntitiesByCategoryType,
} from './kubernetes_cluster_filter';
import type { KubernetesResourceType } from './kubernetes_cluster_filter';
import {
  CLOUD_PROVIDER_FILTER_ALL,
  CloudProviderFilter,
  filterEntitiesByProvider,
} from './cloud_provider_filter';
import { AllEntitiesOverviewView } from './all_entities_overview_view';
import { MonitoringAssetsView } from './monitoring_assets_view';
import { SavedViewsBar } from './saved_views_bar';
import { SaveViewButton } from './save_view_button';
import { compileEntityKql, entityMatchesFilters } from './entity_kql';
import { applyK8sInventoryCellFilter } from './k8s_inventory_cell_filter';
import { useEntityLabDataView } from './use_entity_lab_data_view';
import { useEntityValueSuggestions } from './use_entity_value_suggestions';
import { EntityErrorBoundary } from './entity_error_boundary';
import {
  EntityLabAlertDetailFlyoutHost,
  type EntityLabAlertDetailFlyoutRequest,
} from './entity_lab_alert_detail_flyout_host';
import { EntityLabAlertDetailMockFlyout } from './entity_lab_alert_detail_mock_flyout';
import {
  EntityLabRuleSummaryFlyout,
  type EntityLabRuleDetailFlyoutRequest,
} from './entity_lab_rule_summary_flyout';
import { StreamsElasticOnAlertsTab } from './streams_elastic_on_alerts_tab';
import {
  CATEGORY_TAB_STORAGE_KEY,
  GROUP_BY_STORAGE_KEY,
  LIST_DENSITY_STORAGE_KEY,
  PAGE_SIZE_CHANGE_EVENT,
  TAG_FILTERS_STORAGE_KEY,
  VIEW_MODE_STORAGE_KEY,
  readPageSizes,
  writePageSizes,
} from './storage_keys';
import {
  DEFAULT_LIST_DENSITY,
  isListDensity,
  type ListDensity,
} from './list_density';
import { ListDisplayOptionsPopover } from './list_display_options_popover';
import {
  encodeInventorySharePayload,
  INVENTORY_SHARE_QUERY_KEY,
  readInventorySharePayloadFromSearch,
} from './inventory_share_url';
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

const isViewMode = (value: unknown): value is ViewMode =>
  value === 'grid' || value === 'list' || value === 'geomap';

/**
 * Phase 1 inventory landing: list view, grouped by Category → Type.
 * Applied once per full page load so a stale localStorage choice (hex
 * map, other groupings) does not stick, while changing the view and
 * walking the left nav still persists until the next reload.
 */
const PHASE1_DEFAULT_GROUP_BY: readonly GroupByFieldId[] = DEFAULT_GROUP_BY;

let phase1InventoryDefaultsApplied = false;
let phase1InventoryDefaultsNeedStateSync = false;

const applyPhase1InventoryDefaultsToStorage = (): void => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(VIEW_MODE_STORAGE_KEY, 'list');
    window.localStorage.setItem(GROUP_BY_STORAGE_KEY, JSON.stringify(PHASE1_DEFAULT_GROUP_BY));
  } catch {
    // Storage blocked — the in-memory sync below still sets the layout.
  }
};

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

/**
 * Page-level list density (Compact / Normal / Expanded) shared by every
 * table on the inventory list view. Personal preference only — not part
 * of saved views.
 */
const useListDensity = (): [ListDensity, (next: ListDensity) => void] => {
  const [density, setDensityState] = useState<ListDensity>(() => {
    if (typeof window === 'undefined') return DEFAULT_LIST_DENSITY;
    try {
      const raw = window.localStorage.getItem(LIST_DENSITY_STORAGE_KEY);
      return isListDensity(raw) ? raw : DEFAULT_LIST_DENSITY;
    } catch {
      return DEFAULT_LIST_DENSITY;
    }
  });
  const setDensity = useCallback((next: ListDensity) => {
    setDensityState(next);
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(LIST_DENSITY_STORAGE_KEY, next);
    } catch {
      // Storage blocked — keep the in-memory value for this session.
    }
  }, []);
  return [density, setDensity];
};

// --- Page-size persistence -------------------------------------------
//
// Per-table rows-per-page choices are persisted in localStorage as a
// `Record<tableKey, size>` map. Each table/grid section reads and writes
// its own entry so changing one table doesn't affect others. The parent
// tracks the map via `usePageSizes` for inclusion in `currentViewState`
// (saved views) and re-reads it whenever any table fires a change event.
// The legacy single-value `pageSize` is kept for backward compat with
// older saved views.

const usePageSizes = (): [Record<string, number>, (next: Record<string, number>) => void] => {
  const [pageSizes, setPageSizesState] = useState<Record<string, number>>(readPageSizes);
  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const listener = () => setPageSizesState(readPageSizes());
    window.addEventListener(PAGE_SIZE_CHANGE_EVENT, listener);
    window.addEventListener('storage', listener);
    return () => {
      window.removeEventListener(PAGE_SIZE_CHANGE_EVENT, listener);
      window.removeEventListener('storage', listener);
    };
  }, []);
  const setPageSizesAndPersist = useCallback((next: Record<string, number>) => {
    setPageSizesState(next);
    writePageSizes(next);
  }, []);
  return [pageSizes, setPageSizesAndPersist];
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
// change — both import from `storage_keys.ts`.

const MAX_STORED_GROUPINGS = 3;

const parseStoredGroupBy = (raw: string | null): GroupByFieldId[] => {
  if (!raw) return [...DEFAULT_GROUP_BY];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) {
      // Cap at the maximum to guard against corrupted/oversized payloads.
      return (parsed as GroupByFieldId[]).slice(0, MAX_STORED_GROUPINGS);
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
    id: 'list' as const,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.viewMode.list', {
      defaultMessage: 'List',
    }),
    iconType: 'list',
  },
  {
    id: 'grid' as const,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.viewMode.grid', {
      defaultMessage: 'Grouped grid',
    }),
    iconType: 'apps',
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

/**
 * Compute the Phase 1 alerts badge from an entity's `alerts` field.
 * Returns an `{ label, color }` object suitable for `EntityFlyout.alertsBadge`.
 */
/** Maps our internal category IDs to the onboarding page's `?category=` param. */
const ONBOARDING_CATEGORY_MAP: Partial<Record<EntityCategoryId, string>> = {
  hosts: 'host',
  cloud: 'cloud',
  kubernetes: 'kubernetes',
  databases: 'database',
  services: 'application',
  networking: 'network',
  middlewares: 'messaging',
  llms: 'aiml',
};

const scenarioBannerDismissedKey = (scenario: string) =>
  `elasticOn_scenarioBannerDismissed_${scenario}`;

const readScenarioBannerDismissed = (scenario: string): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }
  try {
    return sessionStorage.getItem(scenarioBannerDismissedKey(scenario)) === 'true';
  } catch {
    return false;
  }
};

const persistScenarioBannerDismissed = (scenario: string): void => {
  try {
    sessionStorage.setItem(scenarioBannerDismissedKey(scenario), 'true');
  } catch {
    // ignore
  }
};

/** Inventory-backed alerts override for flyout tab data (`null` = no rules configured). */
const inventoryAlertsActiveOverride = (
  entity: Entity | undefined
): number | null | undefined => {
  if (!entity) {
    return undefined;
  }
  if (entity.alerts === undefined) {
    return null;
  }
  return entity.alerts.active;
};

const computeAlertsBadge = (
  entity: Entity | undefined
): { label: string; color: string } | undefined => {
  if (!entity) return undefined;
  if (!entity.alerts) {
    return { label: 'No alert set up', color: 'hollow' };
  }
  const { active } = entity.alerts;
  if (active > 0) {
    return {
      label: `${active} active alert${active === 1 ? '' : 's'}`,
      color: 'danger',
    };
  }
  return { label: '0 active alerts', color: 'success' };
};

const AddObservabilityDataEmptyPrompt = ({
  categoryScope,
}: {
  readonly categoryScope?: EntityCategoryId;
}) => {
  const {
    core: {
      http: { basePath },
    },
  } = useKibana();

  const addDataHref = useMemo(() => {
    const onboardingCategory = categoryScope
      ? (ONBOARDING_CATEGORY_MAP[categoryScope] ?? categoryScope)
      : undefined;
    const appPath = `/app/observabilityOnboarding${
      onboardingCategory ? `?category=${encodeURIComponent(onboardingCategory)}` : ''
    }`;
    return basePath.prepend(appPath);
  }, [basePath, categoryScope]);

  return (
    <EuiEmptyPrompt
      icon={<img src={emptyStateIllustration} alt="" width={120} />}
      title={
        <h2>
          {i18n.translate('xpack.streams.entityCentricLab.entities.emptyState.title', {
            defaultMessage: 'Add Observability data',
          })}
        </h2>
      }
      body={
        <p>
          {i18n.translate('xpack.streams.entityCentricLab.entities.emptyState.body', {
            defaultMessage:
              'Connect your systems and get full visibility into logs, metrics, and traces.',
          })}
        </p>
      }
      actions={[
        <EuiButton fill iconType="plusInCircle" key="add-data" href={addDataHref}>
          {i18n.translate('xpack.streams.entityCentricLab.entities.emptyState.addData', {
            defaultMessage: 'Add data',
          })}
        </EuiButton>,
      ]}
    />
  );
};

const AddDataOverlay = ({ onClose }: { readonly onClose: () => void }) => {
  const { euiTheme } = useEuiTheme();
  return createPortal(
    <div
      css={css`
        position: fixed;
        inset: 0;
        z-index: 100000;
        background: ${euiTheme.colors.backgroundBasePlain};
        overflow-y: auto;
      `}
    >
      <EuiButtonIcon
        iconType="cross"
        aria-label="Close"
        onClick={onClose}
        css={css`
          position: fixed;
          top: 16px;
          right: 16px;
          z-index: 100001;
        `}
        color="text"
        display="base"
        size="m"
      />
      <img
        src={addDataPageImage}
        alt="Add Observability data"
        css={css`
          width: 100%;
          display: block;
        `}
      />
    </div>,
    document.body
  );
};

const NEW_INFRA_EXPERIENCE_UI_SETTING = 'observability:newInfraExperience';
const TRANSITION_COMPLETED_SESSION_KEY = 'elasticOn_transitionCompleted';
const HAS_REVERTED_TO_CLASSIC_SESSION_KEY = 'elasticOn_hasRevertedToClassic';
const PENDING_TRANSITION_MODAL_SESSION_KEY = 'elasticOn_pendingTransitionModal';

const ADVANCED_SETTINGS_NEW_INFRA_PATH =
  '/app/management/kibana/settings?query=newInfraExperience';

const MoreActionsMenu = ({
  onPlayTour,
  newExperienceEnabled,
  onToggleNewExperience,
}: {
  onPlayTour: () => void;
  /** Current state of the new-experience toggle (undefined = hide toggle). */
  newExperienceEnabled?: boolean;
  /** Callback when the user flips the toggle. */
  onToggleNewExperience?: (enabled: boolean) => void;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const button = (
    <EuiButtonIcon
      iconType="boxesVertical"
      aria-label={i18n.translate(
        'xpack.streams.entityCentricLab.entities.moreActions',
        { defaultMessage: 'More actions' }
      )}
      color="text"
      display="base"
      size="s"
      onClick={() => setIsOpen(!isOpen)}
      data-test-subj="entityCentricLabMoreActions"
    />
  );
  return (
    <EuiPopover
      button={button}
      isOpen={isOpen}
      closePopover={() => setIsOpen(false)}
      anchorPosition="downRight"
      panelPaddingSize="none"
    >
      <EuiContextMenuPanel
        size="s"
        items={[
          <EuiContextMenuItem
            key="play-tour"
            icon="play"
            onClick={() => {
              setIsOpen(false);
              onPlayTour();
            }}
            data-test-subj="entityCentricLabMoreActionsPlayTour"
          >
            {i18n.translate(
              'xpack.streams.entityCentricLab.entities.moreActions.playTour',
              { defaultMessage: 'Play feature tour' }
            )}
          </EuiContextMenuItem>,
          ...(newExperienceEnabled !== undefined && onToggleNewExperience
            ? [
                <EuiContextMenuItem
                  key="new-experience-toggle"
                  icon="visGauge"
                  onClick={() => {
                    onToggleNewExperience(!newExperienceEnabled);
                    setIsOpen(false);
                  }}
                  css={css`
                    cursor: pointer;
                  `}
                  data-test-subj="entityCentricLabMoreActionsNewExperience"
                >
                  <EuiFlexGroup
                    alignItems="center"
                    justifyContent="spaceBetween"
                    gutterSize="s"
                    responsive={false}
                  >
                    <EuiFlexItem grow={false}>
                      {i18n.translate(
                        'xpack.streams.entityCentricLab.entities.moreActions.newExperience',
                        { defaultMessage: 'New experience' }
                      )}
                    </EuiFlexItem>
                    <EuiFlexItem grow={false}>
                      <EuiSwitch
                        label=""
                        showLabel={false}
                        checked={newExperienceEnabled}
                        onChange={(e) => {
                          onToggleNewExperience(e.target.checked);
                          setIsOpen(false);
                        }}
                        compressed
                        data-test-subj="entityCentricLabNewExperienceSwitch"
                      />
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiContextMenuItem>,
                <EuiHorizontalRule key="new-experience-hr" margin="none" />,
              ]
            : []),
          <EuiContextMenuItem
            key="documentation"
            icon="documentation"
            onClick={() => {
              setIsOpen(false);
              window.open('https://ela.st/entity-centric-docs', '_blank');
            }}
          >
            {i18n.translate(
              'xpack.streams.entityCentricLab.entities.moreActions.documentation',
              { defaultMessage: 'View documentation' }
            )}
          </EuiContextMenuItem>,
          <EuiContextMenuItem
            key="feedback"
            icon="editorComment"
            onClick={() => {
              setIsOpen(false);
              window.open('https://ela.st/entity-centric-feedback', '_blank');
            }}
          >
            {i18n.translate(
              'xpack.streams.entityCentricLab.entities.moreActions.feedback',
              { defaultMessage: 'Feedback' }
            )}
          </EuiContextMenuItem>,
        ]}
      />
    </EuiPopover>
  );
};

const AllEntitiesViewInner = ({
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
    core: {
      application,
      http: { basePath },
      notifications,
      uiSettings,
    },
    dependencies: {
      start: { agentBuilder, charts, unifiedSearch, observability },
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
  // ElasticOn is infra-first: APM Services (and any other parked
  // category) must not stay as a live inventory page. Bounce stale
  // bookmarks / saved views to All entities.
  useEffect(() => {
    if (!isElasticOn || !categoryScope) return;
    if (!isCategoryHiddenInElasticOn(categoryScope)) return;
    router.push('/entities', { path: {}, query: {} });
  }, [isElasticOn, categoryScope, router]);
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
  const MAX_RANGE_DAYS = 3;
  // Local shortcuts only — never write `timepicker:quickRanges`. Cap at 3 days
  // so the menu matches the inventory limit (Last 7/30/90 days and 1 year omitted).
  const inventoryCommonlyUsedRanges = useMemo(
    () => [
      { start: 'now/d', end: 'now/d', label: 'Today' },
      { start: 'now-1m', end: 'now', label: 'Last 1 minute' },
      { start: 'now-15m', end: 'now', label: 'Last 15 minutes' },
      { start: 'now-30m', end: 'now', label: 'Last 30 minutes' },
      { start: 'now-1h', end: 'now', label: 'Last 1 hour' },
      { start: 'now-24h', end: 'now', label: 'Last 24 hours' },
      { start: 'now-3d', end: 'now', label: 'Last 3 days' },
    ],
    []
  );
  const handleTimeChange = useCallback(
    ({ start, end }: { start: string; end: string }) => {
      const parsedStart = datemath.parse(start);
      const parsedEnd = datemath.parse(end, { roundUp: true });
      if (parsedStart && parsedEnd) {
        const diffDays = parsedEnd.diff(parsedStart, 'days', true);
        if (diffDays > MAX_RANGE_DAYS) {
          notifications.toasts.addWarning({
            title: i18n.translate(
              'xpack.streams.entityCentricLab.entities.dateRange.tooWide',
              {
                defaultMessage: 'Date range limited to {days} days',
                values: { days: MAX_RANGE_DAYS },
              }
            ),
            text: i18n.translate(
              'xpack.streams.entityCentricLab.entities.dateRange.tooWideText',
              {
                defaultMessage:
                  'Please select a date range of {days} days or less.',
                values: { days: MAX_RANGE_DAYS },
              }
            ),
          });
          return;
        }
      }
      updateTimeRange({ from: start, to: end });
    },
    [updateTimeRange, notifications.toasts]
  );
  const handleTimeRefresh = useCallback(() => refresh(), [refresh]);

  // One-time repair: a previous version mutated the global
  // timepicker:quickRanges uiSetting, which can corrupt other apps
  // (Dashboard, Discover). If the persisted value is not an array,
  // remove the override so the platform default is restored.
  useEffect(() => {
    try {
      const stored = uiSettings.get('timepicker:quickRanges');
      if (stored != null && !Array.isArray(stored)) {
        uiSettings.remove('timepicker:quickRanges');
      }
    } catch {
      // setting doesn't exist or can't be read — nothing to repair
    }
  }, [uiSettings]);

  // Top-level category filter (All resources) — declared early so search
  // field autocomplete can follow the same scope as K8s facet filters.
  const [categoryFilter, setCategoryFilter] = useState<string>(CATEGORY_FILTER_ALL);
  const [alertsFilter, setAlertsFilter] = useState<AlertsFilterId>(ALERTS_FILTER_ALL);
  const isCrossCategoryPage = !categoryScope && isElasticOn;
  const effectiveCategoryScope: EntityCategoryId | undefined =
    categoryScope ??
    (categoryFilter !== CATEGORY_FILTER_ALL ? (categoryFilter as EntityCategoryId) : undefined);

  const phaseVariation = useVariation('phase');
  const isPhase1 = phaseVariation === 'phase1';

  // ElasticOn Inventory unified search bar: an ad-hoc data view (fields only,
  // no backing index) powers autocomplete + "+ Add filter"; the KQL / filters
  // are evaluated against the seeded entities in-memory (see `entity_kql.ts`).
  const labDataView = useEntityLabDataView(isElasticOn, effectiveCategoryScope, isPhase1);
  // "+ Add filter" chips (transient; not persisted with saved views yet).
  const [labFilters, setLabFilters] = useState<Filter[]>([]);
  // Bumped on every (auto-)refresh to re-roll the fake metric readings so
  // the hex map visibly "lives". The grid consumes the tick to re-seed the
  // reading salt (see GroupedGridView), keeping tiles + tooltips consistent.
  const [refreshTick, setRefreshTick] = useState(0);
  const [showAddDataOverlay, setShowAddDataOverlay] = useState(false);
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

  const dataVariation = useVariation('data') as DataVariation;
  const detailVariation = useVariation('detail') as DetailVariation;
  const isDemoEmptyCategoryPage =
    isElasticOn &&
    dataVariation === 'default' &&
    isElasticOnDefaultEmptyCategory(categoryScope);
  const showAddDataEmptyPrompt =
    isElasticOn && (dataVariation === 'empty' || isDemoEmptyCategoryPage);
  const tableStyleVariation = useVariation('tableStyle') as TableStyleVariation;
  const dashboardStyleVariation = useVariation('dashboardStyle') as
    | 'embedded'
    | 'list'
    | 'listWithPreview';
  const showDashboardThumbnails = useVariation('dashboardThumbnails') === 'show';
  const scenarioVariation = useVariation('scenario');
  const variationCtx = useVariationContext();

  // Feature tour state: auto-starts after transition switch
  const [tourStep, setTourStep] = useState(0);
  const [isTourActive, setIsTourActive] = useState(false);
  const tourStepCount = 5;

  useEffect(() => {
    if (consumeTourFlag()) {
      setIsTourActive(true);
      setTourStep(1);
    }
  }, [scenarioVariation]);

  const advanceTour = useCallback(() => {
    setTourStep((prev) => {
      if (prev >= tourStepCount) {
        setIsTourActive(false);
        return 0;
      }
      return prev + 1;
    });
  }, []);

  const closeTour = useCallback(() => {
    setIsTourActive(false);
    setTourStep(0);
  }, []);

  const [transitionCompleted, setTransitionCompleted] = useState(
    () => sessionStorage.getItem(TRANSITION_COMPLETED_SESSION_KEY) === 'true'
  );
  // Track whether the user explicitly reverted via the toggle (skip modal)
  const [revertedViaToggle, setRevertedViaToggle] = useState(false);

  const applyNewInfraEnabledFromAdvancedSettings = useCallback(() => {
    sessionStorage.setItem(TRANSITION_COMPLETED_SESSION_KEY, 'true');
    sessionStorage.removeItem(PENDING_TRANSITION_MODAL_SESSION_KEY);
    sessionStorage.removeItem(HAS_REVERTED_TO_CLASSIC_SESSION_KEY);
    setTransitionCompleted(true);
    setRevertedViaToggle(false);
  }, []);

  const handleTransitionSwitch = useCallback(() => {
    sessionStorage.setItem(TRANSITION_COMPLETED_SESSION_KEY, 'true');
    sessionStorage.removeItem(PENDING_TRANSITION_MODAL_SESSION_KEY);
    sessionStorage.removeItem(HAS_REVERTED_TO_CLASSIC_SESSION_KEY);
    setTransitionCompleted(true);
    setRevertedViaToggle(false);
    uiSettings.set(NEW_INFRA_EXPERIENCE_UI_SETTING, true);
  }, [uiSettings]);

  const handleRevertToClassic = useCallback(() => {
    sessionStorage.removeItem(TRANSITION_COMPLETED_SESSION_KEY);
    sessionStorage.setItem(HAS_REVERTED_TO_CLASSIC_SESSION_KEY, 'true');
    sessionStorage.removeItem(PENDING_TRANSITION_MODAL_SESSION_KEY);
    setTransitionCompleted(false);
    // Reverting to the classic screenshot should not dim it behind the modal
    // scrim (toggle-off, Advanced Settings, etc.).
    setRevertedViaToggle(true);
    if (variationCtx.get('scenario') !== 'transition') {
      variationCtx.set('scenario', 'transition');
    }
  }, [variationCtx]);

  const newInfraEnabled = useObservable(
    uiSettings.get$<boolean>(NEW_INFRA_EXPERIENCE_UI_SETTING, true),
    uiSettings.get<boolean>(NEW_INFRA_EXPERIENCE_UI_SETTING, true)
  );
  const prevNewInfraRef = useRef<boolean | undefined>(undefined);

  useEffect(() => {
    const prev = prevNewInfraRef.current;
    const pendingTransitionModal =
      sessionStorage.getItem(PENDING_TRANSITION_MODAL_SESSION_KEY) === 'true';

    if (prev === undefined) {
      prevNewInfraRef.current = newInfraEnabled;
      if (!newInfraEnabled) {
        handleRevertToClassic();
      } else if (
        sessionStorage.getItem(HAS_REVERTED_TO_CLASSIC_SESSION_KEY) === 'true' &&
        !pendingTransitionModal
      ) {
        applyNewInfraEnabledFromAdvancedSettings();
      }
      return;
    }

    if (prev === newInfraEnabled) {
      return;
    }
    prevNewInfraRef.current = newInfraEnabled;

    if (!newInfraEnabled) {
      handleRevertToClassic();
      return;
    }
    if (!pendingTransitionModal) {
      applyNewInfraEnabledFromAdvancedSettings();
    }
  }, [
    newInfraEnabled,
    applyNewInfraEnabledFromAdvancedSettings,
    handleRevertToClassic,
  ]);

  const isBannerScenario =
    (scenarioVariation === 'transition' && transitionCompleted) ||
    scenarioVariation === 'banner-admin' ||
    scenarioVariation === 'banner-user';
  const [bannerDismissed, setBannerDismissed] = useState(() =>
    readScenarioBannerDismissed(scenarioVariation)
  );

  const dismissScenarioBanner = useCallback(() => {
    setBannerDismissed(true);
    persistScenarioBannerDismissed(scenarioVariation);
  }, [scenarioVariation]);

  const startScenarioTour = useCallback(() => {
    dismissScenarioBanner();
    setIsTourActive(true);
    setTourStep(1);
  }, [dismissScenarioBanner]);

  // Admins (default / transition / banner-admin) can revert; banner-user cannot.
  const canRevertToClassicUx = scenarioVariation !== 'banner-user';

  const pendingTransitionModal =
    sessionStorage.getItem(PENDING_TRANSITION_MODAL_SESSION_KEY) === 'true';
  const hasRevertedToClassic =
    sessionStorage.getItem(HAS_REVERTED_TO_CLASSIC_SESSION_KEY) === 'true';
  const showOldForTransitionModal =
    newInfraEnabled &&
    !transitionCompleted &&
    (pendingTransitionModal ||
      (scenarioVariation === 'transition' && !hasRevertedToClassic));

  const showOldExperiencePage =
    canRevertToClassicUx && (!newInfraEnabled || showOldForTransitionModal);
  const showOldPageTransitionModal =
    newInfraEnabled && showOldForTransitionModal && !revertedViaToggle;

  const openRevertSettings = useCallback(() => {
    application.navigateToUrl(basePath.prepend(ADVANCED_SETTINGS_NEW_INFRA_PATH));
  }, [application, basePath]);

  const handleToggleNewExperience = useCallback(
    (enabled: boolean) => {
      if (enabled) {
        setRevertedViaToggle(false);
        sessionStorage.removeItem(TRANSITION_COMPLETED_SESSION_KEY);
        sessionStorage.setItem(PENDING_TRANSITION_MODAL_SESSION_KEY, 'true');
        sessionStorage.removeItem(HAS_REVERTED_TO_CLASSIC_SESSION_KEY);
        setTransitionCompleted(false);
        variationCtx.set('scenario', 'transition');
      } else {
        setRevertedViaToggle(true);
        sessionStorage.removeItem(TRANSITION_COMPLETED_SESSION_KEY);
        sessionStorage.setItem(HAS_REVERTED_TO_CLASSIC_SESSION_KEY, 'true');
        sessionStorage.removeItem(PENDING_TRANSITION_MODAL_SESSION_KEY);
        setTransitionCompleted(false);
        variationCtx.set('scenario', 'transition');
      }
      uiSettings.set(NEW_INFRA_EXPERIENCE_UI_SETTING, enabled);
    },
    [uiSettings, variationCtx]
  );

  const prevScenarioRef = useRef(scenarioVariation);
  useEffect(() => {
    if (prevScenarioRef.current !== scenarioVariation) {
      prevScenarioRef.current = scenarioVariation;
      setBannerDismissed(readScenarioBannerDismissed(scenarioVariation));
      sessionStorage.removeItem('elasticOn_transitionCompleted');
      setTransitionCompleted(false);
    }
  }, [scenarioVariation]);

  const flyoutSize = detailVariation === 'largeFlyout' ? 'l' : 'm';
  const dataset = useMemo(() => buildFakeEntities(dataVariation), [dataVariation]);
  // Narrow the dataset to the active category once, then drive every
  // downstream concern (facets, summary, grid, list, flyout context) off
  // the same slice. Doing the filter here — rather than at each consumer —
  // keeps the rest of the component identical to the un-scoped All
  // entities page.
  const scopedEntities = useMemo(() => {
    let list = categoryScope
      ? (categoryScope as string) === 'cloud'
        ? dataset.entities.filter((entity) => entity.provider != null)
        : dataset.entities.filter((entity) => entity.category === categoryScope)
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
    // ElasticOn hides APM Services (and any other infra-parked
    // categories) from the inventory. Seed data stays intact so Latest
    // and the flyout name lookup can still resolve those entities.
    if (isElasticOn) {
      list = list.filter((entity) => !isCategoryHiddenInElasticOn(entity.category));
    }
    return list;
  }, [dataset.entities, categoryScope, cloudProviderScope, cloudServiceScope, isElasticOn]);
  // Match the left-nav category slice: routed scope wins; on All resources
  // the category combo applies the same narrowing (Cloud → `provider` set).
  const effectiveInventoryEntities = useMemo(() => {
    if (categoryScope) {
      return scopedEntities;
    }
    if (isCrossCategoryPage && categoryFilter !== CATEGORY_FILTER_ALL) {
      if (categoryFilter === 'cloud') {
        return scopedEntities.filter((entity) => entity.provider != null);
      }
      return scopedEntities.filter((entity) => entity.category === categoryFilter);
    }
    return scopedEntities;
  }, [categoryScope, isCrossCategoryPage, categoryFilter, scopedEntities]);
  // Feed the unified search bar's value autocomplete from the visible slice,
  // so suggestions match the facet dropdowns (e.g. `environment:` offers the
  // same environment names). ElasticOn-only; no-op otherwise.
  useEntityValueSuggestions(isElasticOn, labDataView, effectiveInventoryEntities);
  // Tag facets must be computed from the visible slice. If we kept them
  // global, a scoped page would show filter options that always empty the
  // grid (e.g. "Team: payments" on the Databases page when no
  // database is tagged with that team).
  const tagFacets = useMemo(
    () => getTagFacets(effectiveInventoryEntities),
    [effectiveInventoryEntities]
  );
  // Entity-type-specific "extra" filters (e.g. Hosts → OS / Cloud provider /
  // Service name). Only surfaced when the inventory is scoped to a category
  // that declares them, and only in ElasticOn.
  const extraFilterDefs = useMemo(
    () =>
      isElasticOn && effectiveCategoryScope && effectiveCategoryScope !== 'cloud'
        ? getCategoryExtraFilters(effectiveCategoryScope)
        : [],
    [isElasticOn, effectiveCategoryScope]
  );
  const extraFacets = useMemo(
    () => getExtraFacets(effectiveInventoryEntities, extraFilterDefs),
    [effectiveInventoryEntities, extraFilterDefs]
  );
  const [activeExtraFilters, setActiveExtraFilters] =
    useState<ActiveExtraFilters>(EMPTY_EXTRA_FILTERS);
  // Extra filters are category-specific, so clear them when the scope changes
  // to avoid a selection from one category silently narrowing another.
  useEffect(() => {
    setActiveExtraFilters(EMPTY_EXTRA_FILTERS);
  }, [effectiveCategoryScope, cloudProviderScope, cloudServiceScope]);

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
  // Runs before the view-mode / group-by hooks hydrate so Phase 1 reads
  // the demo defaults (list view, Type) instead of a stale choice.
  useState(() => {
    if (!isElasticOn || !isPhase1 || phase1InventoryDefaultsApplied) return 0;
    applyPhase1InventoryDefaultsToStorage();
    phase1InventoryDefaultsApplied = true;
    phase1InventoryDefaultsNeedStateSync = true;
    return 0;
  });
  const [viewMode, setViewMode] = useEntitiesViewMode();
  const [listDensity, setListDensity] = useListDensity();
  const [pageSizes, setPageSizes] = usePageSizes();

  // Some tour steps are anchored to DOM elements that only render in
  // specific view modes (e.g. step 3 "Color by" lives inside
  // GroupedGridView which is grid-only). If the user is in a different
  // mode, auto-skip to the next step so the tour doesn't vanish.
  //
  // Map: step number → required view mode. Steps not listed here are
  // assumed to render in all modes.
  const tourStepViewModeRequirements: Record<number, ViewMode> = useMemo(
    () => ({ 3: 'grid' }),
    []
  );
  useEffect(() => {
    if (!isTourActive || tourStep === 0) return;
    const requiredMode = tourStepViewModeRequirements[tourStep];
    if (requiredMode && viewMode !== requiredMode) {
      setTourStep((prev) => Math.min(prev + 1, tourStepCount));
    }
  }, [isTourActive, tourStep, viewMode, tourStepViewModeRequirements]);

  // ElasticOn "Group by" (1–3 fields). Non-ElasticOn modes never surface the
  // control, so this stays at the built-in Category → Type default there.
  const [groupBy, setGroupBy] = useEntitiesGroupBy();

  // Previously the Kubernetes page auto-swapped to Cluster → Type grouping
  // in ElasticOn; now all categories use the uniform Category → Type default.

  // "Group by" fields offered on this page (core + category-scoped attributes)
  // and the resolved defs for the active selection. `customGroupBy` is only set
  // when ElasticOn and the selection differs from the built-in Category → Type
  // default — that's the signal the grid/list use to switch to the generic,
  // health-coloured layout. A selection whose fields don't resolve on the
  // current page (e.g. a Hosts-only attribute after navigating away) collapses
  // back to the default layout rather than rendering an empty grouping.
  const groupByFields = useMemo(
    () => getGroupByFields(effectiveCategoryScope, isElasticOn, phaseVariation as string),
    [effectiveCategoryScope, isElasticOn, phaseVariation]
  );

  // Sanitise: strip groupBy IDs that don't exist in the current field
  // catalog (e.g. K8s-only fields after navigating to Hosts, or stale
  // localStorage from a previous phase). Without this, phantom IDs
  // accumulate in the selection array — the dropdown shows them as
  // "selected" but they resolve to nothing, producing confusing state.
  useEffect(() => {
    if (groupBy.length === 0) return;
    const validIds = new Set(groupByFields.map((f) => f.id));
    const sanitised = groupBy.filter((id) => validIds.has(id));
    if (sanitised.length !== groupBy.length) {
      setGroupBy(sanitised.length > 0 ? sanitised : [...DEFAULT_GROUP_BY]);
    }
  }, [groupBy, groupByFields, setGroupBy]);

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

    // On a category-scoped page, grouping by "Category" is redundant (only
    // one value). Always strip it so the user sees meaningful sub-groups
    // instead of a single wrapper matching the page title.
    if (categoryScope) {
      const withoutCategory = activeGroupByFields.filter((f) => f.id !== 'category');
      // If Category was the *only* field → flat / ungrouped.
      if (withoutCategory.length === 0) return [];
      return withoutCategory;
    }

    return activeGroupByFields;
  }, [isElasticOn, groupBy, activeGroupByFields, categoryScope]);

  // ---------------------------------------------------------------------------
  // Top-level Category filter — derived values (state lives above for search).
  // ---------------------------------------------------------------------------
  const visibleCategories = useMemo(
    () => getVisibleEntityCategories(isElasticOn),
    [isElasticOn]
  );
  const categoriesWithEntities = useMemo(() => {
    const present = new Set(scopedEntities.map((e) => e.category));
    return visibleCategories.filter((c) => present.has(c.id));
  }, [scopedEntities, visibleCategories]);

  // Kubernetes cluster filter lifted to page level when on the K8s
  // category page OR when "Kubernetes" is selected in the top-level
  // category filter on the cross-category page.
  const showK8sFilters =
    (!!categoryScope ? categoryScope === 'kubernetes' : categoryFilter === 'kubernetes') && isElasticOn;
  /** Cell "Filter for" and flyout "Add to filter" — same scope as K8s facet filters. */
  const enableK8sAddToFilterActions = showK8sFilters;
  const [k8sResourceType, setK8sResourceType] = useState<KubernetesResourceType>(KUBERNETES_RESOURCE_TYPE_ALL);
  const [k8sClusterFilter, setK8sClusterFilter] = useState<string>(KUBERNETES_FILTER_ALL);
  const [k8sNamespaceFilter, setK8sNamespaceFilter] = useState<string>(KUBERNETES_FILTER_ALL);
  const [k8sDeploymentFilter, setK8sDeploymentFilter] = useState<string>(KUBERNETES_FILTER_ALL);
  const [k8sNodeFilter, setK8sNodeFilter] = useState<string>(KUBERNETES_FILTER_ALL);

  const k8sFilterVisibility = useMemo(
    () => resourceTypeFilterVisibility(k8sResourceType),
    [k8sResourceType]
  );

  // When the K8s filters are driven by the top-level category filter
  // (cross-category page), scope them to category-filtered entities.
  const k8sBaseEntities = effectiveInventoryEntities;
  const k8sEntitiesForFilters = useMemo(
    () => (showK8sFilters ? filterEntitiesByResourceType(k8sBaseEntities, k8sResourceType) : k8sBaseEntities),
    [showK8sFilters, k8sBaseEntities, k8sResourceType]
  );

  const k8sClusterNames = useMemo(
    () => (showK8sFilters ? getKubernetesClusterNames(k8sBaseEntities) : []),
    [showK8sFilters, k8sBaseEntities]
  );
  const k8sNamespaceNames = useMemo(
    () => (showK8sFilters && k8sFilterVisibility.showNamespace
      ? getKubernetesNamespaceNames(k8sEntitiesForFilters, k8sClusterFilter, k8sClusterNames)
      : []),
    [showK8sFilters, k8sEntitiesForFilters, k8sClusterFilter, k8sClusterNames, k8sFilterVisibility.showNamespace]
  );
  const effectiveK8sNamespaceFilter =
    k8sNamespaceFilter !== KUBERNETES_FILTER_ALL && !k8sNamespaceNames.includes(k8sNamespaceFilter)
      ? KUBERNETES_FILTER_ALL
      : k8sNamespaceFilter;
  const k8sDeploymentNames = useMemo(
    () => (showK8sFilters && k8sFilterVisibility.showDeployment
      ? getKubernetesDeploymentNames(k8sEntitiesForFilters, k8sClusterFilter, effectiveK8sNamespaceFilter, k8sClusterNames)
      : []),
    [showK8sFilters, k8sEntitiesForFilters, k8sClusterFilter, effectiveK8sNamespaceFilter, k8sClusterNames, k8sFilterVisibility.showDeployment]
  );
  const effectiveK8sDeploymentFilter =
    k8sDeploymentFilter !== KUBERNETES_FILTER_ALL && !k8sDeploymentNames.includes(k8sDeploymentFilter)
      ? KUBERNETES_FILTER_ALL
      : k8sDeploymentFilter;
  const k8sNodeNames = useMemo(
    () => (showK8sFilters && k8sFilterVisibility.showNode
      ? getKubernetesNodeNames(k8sEntitiesForFilters, k8sClusterFilter, k8sClusterNames)
      : []),
    [showK8sFilters, k8sEntitiesForFilters, k8sClusterFilter, k8sClusterNames, k8sFilterVisibility.showNode]
  );
  const effectiveK8sNodeFilter =
    k8sNodeFilter !== KUBERNETES_FILTER_ALL && !k8sNodeNames.includes(k8sNodeFilter)
      ? KUBERNETES_FILTER_ALL
      : k8sNodeFilter;
  const handleK8sResourceTypeChange = useCallback(
    (next: KubernetesResourceType) => {
      setK8sResourceType(next);
      setK8sClusterFilter(KUBERNETES_FILTER_ALL);
      setK8sNamespaceFilter(KUBERNETES_FILTER_ALL);
      setK8sDeploymentFilter(KUBERNETES_FILTER_ALL);
      setK8sNodeFilter(KUBERNETES_FILTER_ALL);
    },
    []
  );
  const handleK8sClusterChange = useCallback(
    (next: string) => {
      setK8sClusterFilter(next);
      setK8sNamespaceFilter(KUBERNETES_FILTER_ALL);
      setK8sDeploymentFilter(KUBERNETES_FILTER_ALL);
      setK8sNodeFilter(KUBERNETES_FILTER_ALL);
    },
    []
  );
  const handleK8sNamespaceChange = useCallback(
    (next: string) => {
      setK8sNamespaceFilter(next);
      setK8sDeploymentFilter(KUBERNETES_FILTER_ALL);
    },
    []
  );

  // Cloud provider filter — shown on the Cloud inventory in ElasticOn,
  // mirrors the K8s cluster filter (category route or All resources + Cloud).
  const isCloudCategoryPage =
    effectiveCategoryScope === 'cloud' && isElasticOn && !cloudProviderScope;
  const [cloudProviderFilter, setCloudProviderFilter] = useState<string>(
    CLOUD_PROVIDER_FILTER_ALL
  );

  const handleCategoryFilterChange = useCallback(
    (next: string) => {
      setCategoryFilter(next);
      // Reset sub-filters when category changes.
      setK8sResourceType(KUBERNETES_RESOURCE_TYPE_ALL);
      setK8sClusterFilter(KUBERNETES_FILTER_ALL);
      setK8sNamespaceFilter(KUBERNETES_FILTER_ALL);
      setK8sDeploymentFilter(KUBERNETES_FILTER_ALL);
      setK8sNodeFilter(KUBERNETES_FILTER_ALL);
      setCloudProviderFilter(CLOUD_PROVIDER_FILTER_ALL);
      setCategoryTypeFilter(CATEGORY_RESOURCE_TYPE_ALL);
    },
    []
  );

  // Generic category resource-type filter — shown on non-K8s category
  // pages that have 2+ distinct entity types (Hosts, Cloud, Networking, etc.).
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<string>(CATEGORY_RESOURCE_TYPE_ALL);
  const categoryTypeLabels = useMemo(
    () => {
      const scope = effectiveCategoryScope;
      if (!scope || scope === 'kubernetes' || !isElasticOn) return [];
      return getEntityTypeLabels(
        categoryScope || (isCrossCategoryPage && categoryFilter !== CATEGORY_FILTER_ALL)
          ? effectiveInventoryEntities
          : scopedEntities
      );
    },
    [
      effectiveCategoryScope,
      isElasticOn,
      categoryScope,
      isCrossCategoryPage,
      categoryFilter,
      effectiveInventoryEntities,
      scopedEntities,
    ]
  );
  const showCategoryTypeFilter = categoryTypeLabels.length >= 2;

  // Reset category sub-filters when the effective inventory category changes.
  const prevEffectiveCategoryScopeRef = useRef(effectiveCategoryScope);
  useEffect(() => {
    if (prevEffectiveCategoryScopeRef.current !== effectiveCategoryScope) {
      prevEffectiveCategoryScopeRef.current = effectiveCategoryScope;
      setCategoryTypeFilter(CATEGORY_RESOURCE_TYPE_ALL);
      setCloudProviderFilter(CLOUD_PROVIDER_FILTER_ALL);
    }
  }, [effectiveCategoryScope]);

  // Pending-search consumption: the `search` string can't ride the
  // persisted-state pipeline (it's per-mount `useState`, not
  // localStorage). When a saved-view apply required navigating between
  // categories, `applyViewToStorage` parked the target search here —
  // read it once on mount, apply it, and clear the slot.
  useEffect(() => {
    const pending = consumePendingSearch();
    if (pending !== null) setSearch(pending);
  }, []);

  // Consume "Add to filter" intent from the full-page detail view. The
  // detail page stashes the entity's K8s context in sessionStorage before
  // navigating here so the filters can be applied on mount.
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem('entityCentricLab_addToFilter');
      if (!raw) return;
      sessionStorage.removeItem('entityCentricLab_addToFilter');
      const intent = JSON.parse(raw) as {
        cluster?: string;
        namespace?: string;
        deployment?: string;
        node?: string;
      };
      setK8sResourceType(KUBERNETES_RESOURCE_TYPE_ALL);
      if (intent.cluster) setK8sClusterFilter(intent.cluster);
      if (intent.namespace) setK8sNamespaceFilter(intent.namespace);
      if (intent.deployment) setK8sDeploymentFilter(intent.deployment);
      if (intent.node) setK8sNodeFilter(intent.node);
    } catch {
      // ignore
    }
  }, []);

  // Two flyout slots so the shared flyout's parent/child session can dock two
  // entities side by side: `selectedEntityName` is the parent (session
  // `'start'`), `childEntityName` is the child (session `'inherit'`). The ref
  // mirrors the parent so the stable `openEntity` callback can decide, without
  // re-creating on every selection change, whether a click should open the
  // parent (nothing open yet) or a child (parent already open).
  // Restore flyout from URL: `?flyoutEntity=` comes from back-navigation
  // after full-page expand; `?entity=` is the deep-link param for sharing.
  // An optional `?tab=` deep-links to a specific flyout tab.
  const [selectedEntityName, setSelectedEntityName] = useState<string | null>(() => {
    const params = new URLSearchParams(location.search);
    const restored = params.get('flyoutEntity') ?? params.get('entity');
    if (params.has('flyoutEntity')) {
      params.delete('flyoutEntity');
      history.replace({ ...location, search: params.toString() });
    }
    // Seed the flyout tab from the URL so the flyout opens on the right tab.
    const tabParam = params.get('tab');
    if (restored && tabParam) {
      try {
        sessionStorage.setItem('entityCentricLab_activeTab', tabParam);
      } catch {
        // ignore
      }
    }
    return restored;
  });
  const [childEntityName, setChildEntityName] = useState<string | null>(null);
  const [alertDetailRequest, setAlertDetailRequest] =
    useState<EntityLabAlertDetailFlyoutRequest | null>(null);
  const [ruleDetailRequest, setRuleDetailRequest] =
    useState<EntityLabRuleDetailFlyoutRequest | null>(null);
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
  const loadViewId = useMemo(
    () => (isLatest ? new URLSearchParams(location.search).get('loadView') : null),
    [isLatest, location.search]
  );
  // Phase 1 landing: list view, every category, grouped by Category → Type.
  // The storage write above covers the first mount; this also catches a
  // phase switch to Phase 1 after the persisted hooks have already hydrated.
  useEffect(() => {
    if (!isElasticOn || !isPhase1) {
      if (!isPhase1) phase1InventoryDefaultsApplied = false;
      return;
    }
    // Explicit saved view in the URL — apply that snapshot (incl. list vs hex)
    // instead of forcing the Phase 1 demo defaults.
    if (loadViewId) return;
    if (phase1InventoryDefaultsApplied && !phase1InventoryDefaultsNeedStateSync) return;
    applyPhase1InventoryDefaultsToStorage();
    phase1InventoryDefaultsApplied = true;
    phase1InventoryDefaultsNeedStateSync = false;
    setViewMode('list');
    // Left-nav alert badges deep-link with `?groupBy=alerts` — don't clobber that.
    if (!new URLSearchParams(location.search).has('groupBy')) {
      setGroupBy([...PHASE1_DEFAULT_GROUP_BY]);
    }
    setCategoryFilter(CATEGORY_FILTER_ALL);
  }, [
    isElasticOn,
    isPhase1,
    loadViewId,
    setViewMode,
    setGroupBy,
    setCategoryFilter,
    location.search,
  ]);

  // Left-nav alert badges link here with `?groupBy=alerts` (comma-separated for more).
  useEffect(() => {
    const raw = new URLSearchParams(location.search).get('groupBy');
    if (!raw) return;
    const ids = raw
      .split(',')
      .map((part) => part.trim())
      .filter((part): part is GroupByFieldId => part.length > 0);
    if (ids.length === 0) return;
    setGroupBy(ids);
  }, [location.search, setGroupBy]);

  // Left-nav alert bell: `?alertsFilter=active` (and other alert buckets).
  useEffect(() => {
    const parsed = parseAlertsFilterFromSearch(location.search);
    if (!parsed) return;
    setAlertsFilter(parsed);
    if (parsed !== ALERTS_FILTER_ALL) {
      setCategoryTab('inventory');
    }
  }, [location.search, setCategoryTab]);
  // Overview is the default landing tab on both the per-category pages
  // and the cross-category `/entities` page. On the cross-category page
  // Overview aggregates every category (see `AllEntitiesOverviewView`),
  // so we no longer gate on `categoryScope` here.
  //
  // In Latest the Monitoring/Overview surface is removed entirely, so the
  // page always renders the Inventory surface regardless of the persisted tab.
  const showOverviewTab = !isLatest && categoryTab === 'monitoring';
  const isCategoryEmptyState =
    showAddDataEmptyPrompt || (showOverviewTab && isDemoEmptyCategoryPage);

  // Latest: apply a saved view opened from the left nav. The nav can only link
  // (no click handler), so it encodes the view id in `?loadView=<id>`. We keep
  // that param in the URL (rather than stripping it) so the view stays
  // highlighted in the nav and survives a refresh — the id is the single source
  // of truth for "which view is loaded".
  const { views: savedViewsList } = savedViewsApi;

  const applyViewStateSnapshot = useCallback(
    (state: SavedViewState) => {
      setCategoryTab(state.tab);
      setActiveTagFilters(state.filters);
      setViewMode(state.viewMode);
      setSearch(state.search);
      setActiveExtraFilters(state.extraFilters ?? EMPTY_EXTRA_FILTERS);
      setLabFilters(state.queryFilters ?? []);
      setGroupBy([...(state.groupBy ?? DEFAULT_GROUP_BY)]);
      setPageSizes(state.pageSizes ?? {});
      setK8sResourceType(
        (state.k8sFilters?.resourceType as KubernetesResourceType | undefined) ??
          KUBERNETES_RESOURCE_TYPE_ALL
      );
      setK8sClusterFilter(state.k8sFilters?.cluster ?? KUBERNETES_FILTER_ALL);
      setK8sNamespaceFilter(state.k8sFilters?.namespace ?? KUBERNETES_FILTER_ALL);
      setK8sDeploymentFilter(state.k8sFilters?.deployment ?? KUBERNETES_FILTER_ALL);
      setK8sNodeFilter(state.k8sFilters?.node ?? KUBERNETES_FILTER_ALL);
      setCategoryFilter(state.categoryFilter ?? CATEGORY_FILTER_ALL);
      setCloudProviderFilter(state.cloudProviderFilter ?? CLOUD_PROVIDER_FILTER_ALL);
      setCategoryTypeFilter(state.categoryTypeFilter ?? CATEGORY_RESOURCE_TYPE_ALL);
      if (state.storeTime && state.timeRange) {
        updateTimeRange({ from: state.timeRange.from, to: state.timeRange.to });
      }
    },
    [
      setActiveTagFilters,
      setCategoryTab,
      setViewMode,
      setGroupBy,
      setPageSizes,
      updateTimeRange,
    ]
  );

  // Shareable URL: `?inventory=<base64>` carries the full on-page snapshot so
  // another user/browser sees the same layout without localStorage saved views.
  const appliedInventoryPayloadRef = useRef<string | null>(null);
  const skipInventoryUrlSyncRef = useRef(false);
  useEffect(() => {
    if (!isLatest) return;
    const params = new URLSearchParams(location.search);
    const raw = params.get(INVENTORY_SHARE_QUERY_KEY);
    if (!raw) return;
    if (appliedInventoryPayloadRef.current === raw) return;
    const state = readInventorySharePayloadFromSearch(location.search);
    if (!state) return;
    appliedInventoryPayloadRef.current = raw;
    skipInventoryUrlSyncRef.current = true;
    applyViewStateSnapshot(state);
    skipInventoryUrlSyncRef.current = false;
  }, [isLatest, location.search, applyViewStateSnapshot]);

  // Apply each `loadView` id exactly once. The setters below (category tab / tag
  // filters / view mode) already persist to localStorage, so we deliberately do
  // NOT call back into the saved-views store here: doing so re-fired this effect
  // via the store subscription and caused an infinite update loop. The ref guard
  // also prevents re-aplying — and clobbering the user's in-progress edits —
  // when the store emits for unrelated reasons (e.g. saving a new view).
  const appliedLoadViewIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!isLatest || !loadViewId) return;
    if (new URLSearchParams(location.search).has(INVENTORY_SHARE_QUERY_KEY)) return;
    if (appliedLoadViewIdRef.current === loadViewId) return;
    const view = savedViewsList.find((candidate) => candidate.id === loadViewId);
    if (!view) return;
    appliedLoadViewIdRef.current = loadViewId;
    applyViewStateSnapshot(view.state);
  }, [
    isLatest,
    loadViewId,
    location.search,
    savedViewsList,
    applyViewStateSnapshot,
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
    // Phase 1 stays on All categories (list view, Type grouping) instead of
    // bouncing to a saved default view.
    if (isPhase1) return;
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
    // Don't bounce into a category ElasticOn currently hides (APM Services).
    if (viewCategory && isCategoryHiddenInElasticOn(viewCategory)) return;
    let pathname = '/entities';
    if (viewCategory === 'cloud' && viewProvider && viewService) {
      pathname = `/entities/cloud/${viewProvider}/${viewService}`;
    } else if (viewCategory === 'cloud' && viewProvider) {
      pathname = `/entities/cloud/${viewProvider}`;
    } else if (viewCategory) {
      pathname = `/entities/${viewCategory}`;
    }
    history.replace({ pathname, search: `?loadView=${encodeURIComponent(view.id)}` });
  }, [isElasticOn, isPhase1, categoryScope, loadViewId, defaultViewId, savedViewsList, history]);

  const filteredEntitiesBeforeCluster = useMemo(() => {
    // ElasticOn: `search` holds a KQL expression driven by the unified
    // search bar (reusing the same state slot so saved views keep working).
    // Evaluate it — plus any "+ Add filter" chips — against the entities.
    if (isElasticOn) {
      const predicate = compileEntityKql(search);
      return scopedEntities.filter(
        (entity) =>
          matchesTagFilters(entity, activeTagFilters, true, isPhase1) &&
          matchesExtraFilters(entity, activeExtraFilters, extraFilterDefs) &&
          predicate(entity) &&
          entityMatchesFilters(labFilters, entity)
      );
    }
    const query = search.trim().toLowerCase();
    return scopedEntities.filter((entity) => {
      if (query && !entity.name.toLowerCase().includes(query)) return false;
      return matchesTagFilters(entity, activeTagFilters, false, isPhase1);
    });
  }, [
    scopedEntities,
    search,
    activeTagFilters,
    isElasticOn,
    isPhase1,
    labFilters,
    activeExtraFilters,
    extraFilterDefs,
  ]);

  // Top-level category filter — narrow to the selected category on the
  // cross-category page before applying K8s / Cloud / type sub-filters.
  const filteredEntitiesAfterCategory = useMemo(
    () =>
      isCrossCategoryPage && categoryFilter !== CATEGORY_FILTER_ALL
        ? categoryFilter === 'cloud'
          ? filteredEntitiesBeforeCluster.filter((entity) => entity.provider != null)
          : filteredEntitiesBeforeCluster.filter((e) => e.category === categoryFilter)
        : filteredEntitiesBeforeCluster,
    [filteredEntitiesBeforeCluster, isCrossCategoryPage, categoryFilter]
  );

  // When on the K8s category page the cluster filter is lifted to page level.
  // Apply it to the filtered slice so counts, summary, and child views all
  // reflect the selection.
  // Kubernetes resource-type + cascading filters are page-level on the K8s
  // category page so counts, summary, and child views all reflect the selection.
  const filteredEntitiesAfterResourceType = useMemo(
    () =>
      showK8sFilters && k8sResourceType !== KUBERNETES_RESOURCE_TYPE_ALL
        ? filterEntitiesByResourceType(filteredEntitiesAfterCategory, k8sResourceType)
        : filteredEntitiesAfterCategory,
    [filteredEntitiesAfterCategory, showK8sFilters, k8sResourceType]
  );
  const filteredEntitiesAfterCluster = useMemo(
    () =>
      showK8sFilters &&
      (k8sClusterFilter !== KUBERNETES_FILTER_ALL ||
        effectiveK8sNamespaceFilter !== KUBERNETES_FILTER_ALL ||
        effectiveK8sDeploymentFilter !== KUBERNETES_FILTER_ALL ||
        effectiveK8sNodeFilter !== KUBERNETES_FILTER_ALL)
        ? filterKubernetesEntities(
            filteredEntitiesAfterResourceType,
            k8sClusterFilter,
            effectiveK8sNamespaceFilter,
            effectiveK8sDeploymentFilter,
            effectiveK8sNodeFilter,
            k8sClusterNames
          )
        : filteredEntitiesAfterResourceType,
    [filteredEntitiesAfterResourceType, showK8sFilters, k8sClusterFilter, effectiveK8sNamespaceFilter, effectiveK8sDeploymentFilter, effectiveK8sNodeFilter, k8sClusterNames]
  );
  // Cloud provider filter — page-level on the Cloud category page.
  const filteredEntitiesAfterProvider = useMemo(
    () =>
      isCloudCategoryPage && cloudProviderFilter !== CLOUD_PROVIDER_FILTER_ALL
        ? filteredEntitiesAfterCluster.filter(
            (entity) => entity.provider === cloudProviderFilter
          )
        : filteredEntitiesAfterCluster,
    [filteredEntitiesAfterCluster, isCloudCategoryPage, cloudProviderFilter]
  );
  // Generic category resource-type filter (non-K8s categories with 2+ types).
  const filteredEntitiesAfterCategoryType = useMemo(
    () =>
      showCategoryTypeFilter && categoryTypeFilter !== CATEGORY_RESOURCE_TYPE_ALL
        ? filterEntitiesByCategoryType(filteredEntitiesAfterProvider, categoryTypeFilter)
        : filteredEntitiesAfterProvider,
    [filteredEntitiesAfterProvider, showCategoryTypeFilter, categoryTypeFilter]
  );
  const filteredEntities = useMemo(
    () =>
      isElasticOn
        ? filteredEntitiesAfterCategoryType.filter((entity) =>
            matchesAlertsFilter(entity, alertsFilter)
          )
        : filteredEntitiesAfterCategoryType,
    [filteredEntitiesAfterCategoryType, isElasticOn, alertsFilter]
  );

  // ElasticOn summary "· N Groups": count distinct level-1 buckets under the
  // active grouping (Category by default), so the header stays truthful when
  // the user regroups (e.g. by Environment).
  // On a single-category page with the default grouping the visible groups
  // are sub-types (e.g. Clusters / Nodes / Pods), not categories — count
  // those instead so the badge matches what the user actually sees.
  const elasticOnGroupCount = useMemo(() => {
    if (!isElasticOn) return 0;
    // Flat / ungrouped: everything sits in a single "All entities" block.
    if (groupBy.length === 0) return filteredEntities.length > 0 ? 1 : 0;

    // On a category-scoped page with the built-in default grouping, count
    // distinct sub-types (the visible panels) rather than distinct categories
    // (which would always be 1).
    if (categoryScope && isDefaultGroupBy(groupBy)) {
      return new Set(
        filteredEntities.map((entity) => entity.subType ?? entity.type)
      ).size;
    }

    // Use the effective first grouping field — `customGroupBy` strips
    // "Category" on scoped pages so the count matches the visible top-level
    // groups (e.g. Type buckets on the K8s page, not the single "Kubernetes"
    // category wrapper).
    const effectiveFields = customGroupBy ?? activeGroupByFields;
    const field = effectiveFields[0] ?? groupByFields[0];
    if (!field) return 0;
    return new Set(filteredEntities.map((entity) => field.valueOf(entity))).size;
  }, [isElasticOn, groupBy, customGroupBy, activeGroupByFields, groupByFields, filteredEntities, categoryScope]);

  const entityCountLabel = useMemo(() => {
    const count = filteredEntities.length.toLocaleString();
    // Truncation banner / "out of N": show when the overflow profile
    // produced more than the visible cap and the user hasn't filtered
    // below that cap (filtered === full scoped inventory).
    if (
      dataset.totalBeforeTruncation &&
      filteredEntities.length >= dataset.totalEntities &&
      filteredEntities.length > 0
    ) {
      return `${count} (out of ${dataset.totalBeforeTruncation.toLocaleString()})`;
    }
    return count;
  }, [filteredEntities.length, dataset.totalBeforeTruncation, dataset.totalEntities]);

  // Any filter dimension active (tags, extra facets, "+ Add filter" chips, or a
  // typed KQL query) — drives the unified "Clear filters" affordance below.
  const hasActiveFilters =
    getVisibleTagKeys(isElasticOn).some((key) => activeTagFilters[key].length > 0) ||
    Object.values(activeExtraFilters).some((values) => values.length > 0) ||
    labFilters.length > 0 ||
    search.trim() !== '' ||
    (isCrossCategoryPage && categoryFilter !== CATEGORY_FILTER_ALL) ||
    (showK8sFilters && (
      k8sResourceType !== KUBERNETES_RESOURCE_TYPE_ALL ||
      k8sClusterFilter !== KUBERNETES_FILTER_ALL ||
      effectiveK8sNamespaceFilter !== KUBERNETES_FILTER_ALL ||
      effectiveK8sDeploymentFilter !== KUBERNETES_FILTER_ALL ||
      effectiveK8sNodeFilter !== KUBERNETES_FILTER_ALL
    )) ||
    (isCloudCategoryPage && cloudProviderFilter !== CLOUD_PROVIDER_FILTER_ALL) ||
    (showCategoryTypeFilter && categoryTypeFilter !== CATEGORY_RESOURCE_TYPE_ALL) ||
    (isElasticOn && alertsFilter !== ALERTS_FILTER_ALL);

  // Reset every filter dimension in one click (ElasticOn toolbar).
  const inventorySummaryScopeKey = effectiveCategoryScope ?? 'all';

  const handleAlertsFilterChange = useCallback(
    (next: AlertsFilterId) => {
      setAlertsFilter(next);
      const params = new URLSearchParams(location.search);
      if (next === ALERTS_FILTER_ALL) {
        params.delete(ALERTS_FILTER_QUERY_PARAM);
      } else {
        params.set(ALERTS_FILTER_QUERY_PARAM, next);
      }
      history.replace({
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      });
    },
    [history, location.pathname, location.search]
  );

  const handleClearFilters = useCallback(() => {
    setActiveTagFilters(EMPTY_TAG_FILTERS);
    setActiveExtraFilters(EMPTY_EXTRA_FILTERS);
    setLabFilters([]);
    setSearch('');
    setCategoryFilter(CATEGORY_FILTER_ALL);
    setAlertsFilter(ALERTS_FILTER_ALL);
    setCloudProviderFilter(CLOUD_PROVIDER_FILTER_ALL);
    setK8sResourceType(KUBERNETES_RESOURCE_TYPE_ALL);
    setK8sClusterFilter(KUBERNETES_FILTER_ALL);
    setK8sNamespaceFilter(KUBERNETES_FILTER_ALL);
    setK8sDeploymentFilter(KUBERNETES_FILTER_ALL);
    setK8sNodeFilter(KUBERNETES_FILTER_ALL);
    setCategoryTypeFilter(CATEGORY_RESOURCE_TYPE_ALL);
    const params = new URLSearchParams(location.search);
    if (params.has(ALERTS_FILTER_QUERY_PARAM)) {
      params.delete(ALERTS_FILTER_QUERY_PARAM);
      history.replace({
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      });
    }
  }, [setActiveTagFilters, history, location.pathname, location.search]);

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

  // One-shot tab intent for EntityFlyout (e.g. Alerts badge → Alerts tab).
  // Seed from the shareable `?tab=` param so a pasted link lands on the
  // same tab the sharer was viewing.
  const [flyoutTabIntent, setFlyoutTabIntent] = useState<{
    tab: string;
    requestId: number;
  } | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const entity = params.get('entity') ?? params.get('flyoutEntity');
      const tab = params.get('tab');
      if (entity && tab) return { tab, requestId: Date.now() };
    } catch {
      // ignore
    }
    return null;
  });

  const readPreferredFlyoutTab = useCallback((): string | null => {
    try {
      return sessionStorage.getItem('entityCentricLab_activeTab');
    } catch {
      return null;
    }
  }, []);

  const writePreferredFlyoutTab = useCallback((tab: string) => {
    try {
      sessionStorage.setItem('entityCentricLab_activeTab', tab);
    } catch {
      // ignore
    }
  }, []);

  /**
   * Keep flyout share params in the URL without touching the page inventory
   * time range (`rangeFrom` / `rangeTo`). Flyout time uses `flyoutFrom` /
   * `flyoutTo` so the two pickers stay independent and both are shareable.
   */
  const syncFlyoutShareParams = useCallback(
    (next: {
      entity?: string | null;
      tab?: string | null;
      flyoutFrom?: string | null;
      flyoutTo?: string | null;
    }) => {
      const params = new URLSearchParams(location.search);
      let changed = false;
      const apply = (key: string, value: string | null | undefined) => {
        if (value === undefined) return;
        if (value === null) {
          if (params.has(key)) {
            params.delete(key);
            changed = true;
          }
          return;
        }
        if (params.get(key) !== value) {
          params.set(key, value);
          changed = true;
        }
      };
      apply('entity', next.entity);
      apply('tab', next.tab);
      apply('flyoutFrom', next.flyoutFrom);
      apply('flyoutTo', next.flyoutTo);
      if (!changed) return;
      history.replace({ ...location, search: params.toString() });
    },
    [location, history]
  );

  // Flyout-only time range from the URL. Falls back to the page range for
  // display until the user changes the flyout picker (which writes
  // `flyoutFrom` / `flyoutTo`).
  const flyoutTimeRange = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return {
      from: params.get('flyoutFrom') ?? rangeFrom,
      to: params.get('flyoutTo') ?? rangeTo,
    };
  }, [location.search, rangeFrom, rangeTo]);

  /**
   * Single funnel for every entity-name click on the page surface (grid
   * tile, list row, geomap donut, service-map node). These have no
   * parent/child relationship, so each click just *replaces* the single
   * open flyout (and tears down any child from a previous in-flyout
   * navigation). Child flyouts are opened only from *inside* a flyout via
   * {@link openChildEntity}.
   */
  const openEntity = useCallback(
    (entityName: string, options?: { tab?: string }) => {
      if (!isEntityOpenable(entityName)) return;
      const params = new URLSearchParams(location.search);
      const tab =
        options?.tab ?? params.get('tab') ?? readPreferredFlyoutTab() ?? undefined;
      if (tab) {
        writePreferredFlyoutTab(tab);
        if (options?.tab) {
          setFlyoutTabIntent({ tab, requestId: Date.now() });
        }
      }
      // Seed flyout time from existing flyout params, else copy the page
      // range so a shared link always carries an explicit flyout window.
      const nextFlyoutFrom = params.get('flyoutFrom') ?? rangeFrom;
      const nextFlyoutTo = params.get('flyoutTo') ?? rangeTo;
      if (detailVariation === 'fullPage') {
        const detailParams = new URLSearchParams();
        // Full-page detail uses the page time params as its only picker.
        detailParams.set('rangeFrom', nextFlyoutFrom);
        detailParams.set('rangeTo', nextFlyoutTo);
        if (tab) detailParams.set('tab', tab);
        history.push({
          pathname: `/entities/detail/${encodeURIComponent(entityName)}`,
          search: `?${detailParams.toString()}`,
        });
        return;
      }
      setSelectedEntityName(entityName);
      setChildEntityName(null);
      setChildEntityContext(null);
      setAlertDetailRequest(null);
      setRuleDetailRequest(null);
      syncFlyoutShareParams({
        entity: entityName,
        tab: tab ?? null,
        flyoutFrom: nextFlyoutFrom,
        flyoutTo: nextFlyoutTo,
      });
    },
    [
      isEntityOpenable,
      detailVariation,
      location.search,
      readPreferredFlyoutTab,
      writePreferredFlyoutTab,
      rangeFrom,
      rangeTo,
      history,
      syncFlyoutShareParams,
    ]
  );

  /** Table Alerts badge — open the flyout parked on the Alerts tab. */
  const openEntityOnAlertsTab = useCallback(
    (entityName: string) => openEntity(entityName, { tab: 'alerts' }),
    [openEntity]
  );

  const handleFlyoutTabChange = useCallback(
    (tab: string) => {
      writePreferredFlyoutTab(tab);
      syncFlyoutShareParams({ tab });
    },
    [writePreferredFlyoutTab, syncFlyoutShareParams]
  );

  const handleFlyoutTimeRangeChange = useCallback(
    (range: { from: string; to: string }) => {
      // Page inventory time (`rangeFrom` / `rangeTo`) stays untouched.
      syncFlyoutShareParams({ flyoutFrom: range.from, flyoutTo: range.to });
    },
    [syncFlyoutShareParams]
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

  // Expand flyout to full page — closes the flyout and navigates to the
  // dedicated detail route. Only wired when `detailVariation` is
  // `flyoutExpandable`.
  //
  // Before navigating away we inject a `flyoutEntity` query param into
  // the *current* URL (via `history.replace`) so that when the user
  // presses "back" on the detail page, the list view re-opens with the
  // flyout already visible for that entity.
  const handleExpandToFullPage = useCallback(
    (currentTab?: string) => {
      if (!selectedEntityName) return;
      // Stamp the current URL so the flyout re-opens on back-navigation.
      // Remove the deep-link `entity` param — `flyoutEntity` takes over.
      const listParams = new URLSearchParams(location.search);
      listParams.delete('entity');
      listParams.set('flyoutEntity', selectedEntityName);
      if (currentTab) {
        listParams.set('tab', currentTab);
        writePreferredFlyoutTab(currentTab);
      }
      history.replace({ ...location, search: listParams.toString() });

      setSelectedEntityName(null);
      setChildEntityName(null);
      setChildEntityContext(null);

      // Carry tab + the flyout time window into the full-page detail URL
      // (detail page only has one picker, mapped to rangeFrom/rangeTo).
      const detailParams = new URLSearchParams();
      detailParams.set('rangeFrom', flyoutTimeRange.from);
      detailParams.set('rangeTo', flyoutTimeRange.to);
      if (currentTab) detailParams.set('tab', currentTab);
      history.push({
        pathname: `/entities/detail/${encodeURIComponent(selectedEntityName)}`,
        search: `?${detailParams.toString()}`,
      });
    },
    [
      selectedEntityName,
      location,
      history,
      flyoutTimeRange.from,
      flyoutTimeRange.to,
      writePreferredFlyoutTab,
    ]
  );

  // Closing the parent tears the whole session down (the child can't
  // outlive its parent); closing the child leaves the parent open.
  const closeEntity = useCallback(() => {
    setSelectedEntityName(null);
    setChildEntityName(null);
    setChildEntityContext(null);
    setAlertDetailRequest(null);
    setRuleDetailRequest(null);
    setFlyoutTabIntent(null);
    // Drop shareable flyout params so refresh doesn't reopen the flyout.
    syncFlyoutShareParams({
      entity: null,
      tab: null,
      flyoutFrom: null,
      flyoutTo: null,
    });
  }, [syncFlyoutShareParams]);
  const closeChildEntity = useCallback(() => {
    setChildEntityName(null);
    setChildEntityContext(null);
  }, []);

  // "Add to filter" from the K8s flyout: keep "All resource types" but fill
  // in the contextual cascade filters (cluster, namespace, node) based on
  // what the entity carries, then close the flyout so the user sees
  // everything in that entity's context.
  const handleAddToK8sFilter = useCallback(
    (entity: Entity) => {
      setK8sResourceType(KUBERNETES_RESOURCE_TYPE_ALL);
      const cluster =
        entity.subType === 'Clusters'
          ? entity.name
          : entity.attributes?.cluster ??
            assignClusterForEntity(entity, k8sClusterNames) ??
            KUBERNETES_FILTER_ALL;
      setK8sClusterFilter(cluster);
      setK8sNamespaceFilter(
        entity.subType === 'Namespaces'
          ? entity.name
          : entity.attributes?.namespace ?? KUBERNETES_FILTER_ALL
      );
      setK8sDeploymentFilter(
        entity.subType === 'Deployments'
          ? entity.name
          : entity.attributes?.deployment ?? KUBERNETES_FILTER_ALL
      );
      setK8sNodeFilter(
        entity.subType === 'Nodes'
          ? entity.name
          : entity.attributes?.node ?? KUBERNETES_FILTER_ALL
      );
      setSelectedEntityName(null);
      setChildEntityName(null);
      setChildEntityContext(null);
      setFlyoutTabIntent(null);
      // Clean up shareable flyout params when closing via "Add to filter".
      syncFlyoutShareParams({
        entity: null,
        tab: null,
        flyoutFrom: null,
        flyoutTo: null,
      });
    },
    [k8sClusterNames, syncFlyoutShareParams]
  );

  const handleK8sInventoryCellFilter = useCallback(
    (args: Parameters<typeof applyK8sInventoryCellFilter>[0]) => {
      applyK8sInventoryCellFilter({
        ...args,
        clusterNames: k8sClusterNames,
        assignCluster: assignClusterForEntity,
        setResourceTypeAll: () => setK8sResourceType(KUBERNETES_RESOURCE_TYPE_ALL),
        setCluster: setK8sClusterFilter,
        setNamespace: setK8sNamespaceFilter,
        setDeployment: setK8sDeploymentFilter,
        setNode: setK8sNodeFilter,
        filterAll: KUBERNETES_FILTER_ALL,
      });
    },
    [k8sClusterNames]
  );

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

  // Dashboards tab: embed a specific dashboard by its saved-object title,
  // scoped to the entity via a phrase filter on `scopeField`.
  // User-linked dashboards carry a `savedObjectId` directly so the renderer
  // skips the title-based lookup.
  const renderTabDashboard = useCallback(
    (
      dashboard: {
        savedObjectTitle: string;
        scopeField: string;
        hiddenPanelIds?: ReadonlySet<string>;
        savedObjectId?: string;
      },
      entityName: string
    ) => (
      <K8sDetailDashboard
        config={{
          dashboardTitle: dashboard.savedObjectTitle,
          scopeField: dashboard.scopeField,
          hiddenPanelIds: dashboard.hiddenPanelIds ?? new Set(),
        }}
        resourceName={entityName}
        rangeFrom={rangeFrom}
        rangeTo={rangeTo}
        directSavedObjectId={dashboard.savedObjectId}
      />
    ),
    [rangeFrom, rangeTo]
  );

  // `agentBuilder` is an *optional* start dep on Streams — when it's
  // available (most environments) the shared flyout's "Add to chat"
  // footer button lights up and the entity context is forwarded to the
  // AI chat with the same payload Discover uses. When it's missing the
  // button is hidden and the rest of the flyout keeps working.
  const renderAlertDetailFlyout = useMemo(
    () => observability?.renderEntityCentricLabAlertDetailFlyout,
    [observability]
  );

  const onOpenAlertDetail = useCallback((request: EntityLabAlertDetailFlyoutRequest) => {
    setRuleDetailRequest(null);
    setAlertDetailRequest(request);
  }, []);

  const closeAlertDetail = useCallback(() => {
    setAlertDetailRequest(null);
  }, []);

  const onOpenRuleDetail = useCallback((request: EntityLabRuleDetailFlyoutRequest) => {
    setAlertDetailRequest(null);
    setRuleDetailRequest(request);
  }, []);

  const closeRuleDetail = useCallback(() => {
    setRuleDetailRequest(null);
  }, []);

  const flyoutServices = useMemo(
    () => ({
      agentBuilder,
      notifications,
      charts,
      renderTabDashboard,
      resourceCopy: isElasticOn,
      density: listDensity,
      renderAlertDetailFlyout,
      onOpenAlertDetail,
      onOpenRuleDetail,
      renderAlertsTab: ({
        alerts,
        entityName: alertEntityName,
      }: {
        alerts: import('@kbn/entity-centric-lab-flyout').AlertsTabData;
        entityName: string;
      }) => (
        <StreamsElasticOnAlertsTab
          alerts={alerts}
          entityName={alertEntityName}
          onOpenAlertRow={(row) =>
            onOpenAlertDetail({ alertRow: row, entityName: alertEntityName })
          }
          onOpenRuleRow={(row) =>
            onOpenRuleDetail({
              ruleId: alertRowToStableRuleUuid(row),
              ruleName: row.ruleName,
              entityName: alertEntityName,
              alertRow: row,
            })
          }
        />
      ),
    }),
    [
      agentBuilder,
      notifications,
      charts,
      renderTabDashboard,
      isElasticOn,
      listDensity,
      renderAlertDetailFlyout,
      onOpenAlertDetail,
      onOpenRuleDetail,
    ]
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
      pageSizes,
      // K8s cascading filters — only meaningful on K8s-scoped pages; still
      // snapshotted so changing them lights the badge and Save persists them.
      k8sFilters: {
        resourceType: k8sResourceType,
        cluster: k8sClusterFilter,
        namespace: k8sNamespaceFilter,
        deployment: k8sDeploymentFilter,
        node: k8sNodeFilter,
      },
      // Cross-category "All resources" category chip.
      categoryFilter,
      // Cloud provider + generic resource-type chips (non-K8s categories).
      cloudProviderFilter,
      categoryTypeFilter,
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
      pageSizes,
      k8sResourceType,
      k8sClusterFilter,
      k8sNamespaceFilter,
      k8sDeploymentFilter,
      k8sNodeFilter,
      categoryFilter,
      cloudProviderFilter,
      categoryTypeFilter,
    ]
  );

  const isLoadedViewModified = loadedView
    ? !areStatesEqual(loadedView.state, currentViewState)
    : false;

  // Snapshot encoded in `?inventory=` so copying the address bar shares the
  // exact layout (list vs hex, filters, group-by, …) plus the live time range.
  const inventorySharePayload = useMemo(() => {
    if (!isLatest) return null;
    return encodeInventorySharePayload({
      ...currentViewState,
      storeTime: true,
      timeRange: { from: rangeFrom, to: rangeTo },
    });
  }, [isLatest, currentViewState, rangeFrom, rangeTo]);

  useEffect(() => {
    if (!isLatest || !inventorySharePayload) return undefined;
    const timer = window.setTimeout(() => {
      if (skipInventoryUrlSyncRef.current) return;
      if (appliedInventoryPayloadRef.current === inventorySharePayload) return;
      const params = new URLSearchParams(location.search);
      params.set(INVENTORY_SHARE_QUERY_KEY, inventorySharePayload);
      appliedInventoryPayloadRef.current = inventorySharePayload;
      history.replace({
        pathname: location.pathname,
        search: params.toString() ? `?${params.toString()}` : '',
      });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [
    isLatest,
    inventorySharePayload,
    history,
    location.pathname,
    location.search,
  ]);

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
      const persisted = withStoredTime(state, storeTime);
      const view = savedViewsApi.saveView(name, persisted);
      if (makeDefault) savedViewsApi.setDefaultView(view.id);
      const params = new URLSearchParams(location.search);
      params.set('loadView', view.id);
      params.set(INVENTORY_SHARE_QUERY_KEY, encodeInventorySharePayload(persisted));
      appliedInventoryPayloadRef.current = params.get(INVENTORY_SHARE_QUERY_KEY);
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
        applyViewStateSnapshot(view.state);
        consumePendingSearch();
        if (isLatest) {
          const params = new URLSearchParams(location.search);
          params.set('loadView', view.id);
          params.set(
            INVENTORY_SHARE_QUERY_KEY,
            encodeInventorySharePayload({
              ...view.state,
              storeTime: view.state.storeTime,
              timeRange: view.state.timeRange,
            })
          );
          appliedInventoryPayloadRef.current = params.get(INVENTORY_SHARE_QUERY_KEY);
          history.replace({
            pathname: location.pathname,
            search: `?${params.toString()}`,
          });
        }
        return;
      }
      const loadViewQuery: Record<string, string> = {};
      if (isLatest) {
        loadViewQuery.loadView = view.id;
        loadViewQuery[INVENTORY_SHARE_QUERY_KEY] = encodeInventorySharePayload(view.state);
      }
      if (targetCategory === null) {
        router.push('/entities', { path: {}, query: loadViewQuery });
      } else if (targetCategory === 'cloud' && targetProvider && targetService) {
        router.push('/entities/cloud/{provider}/{service}', {
          path: { provider: targetProvider, service: targetService },
          query: loadViewQuery,
        });
      } else if (targetCategory === 'cloud' && targetProvider) {
        router.push('/entities/cloud/{provider}', {
          path: { provider: targetProvider },
          query: loadViewQuery,
        });
      } else {
        router.push('/entities/{category}', {
          path: { category: targetCategory },
          query: loadViewQuery,
        });
      }
    },
    [
      categoryScope,
      cloudProviderScope,
      cloudServiceScope,
      isLatest,
      history,
      location.pathname,
      location.search,
      router,
      applyViewStateSnapshot,
    ]
  );

  // ElasticOn drops the Geomap view mode. Hide its toggle option and, if a
  // previously-persisted `geomap` selection is still around, fall back to the
  // grid so the body doesn't render an unavailable view.
  const viewModeOptions = isElasticOn
    ? VIEW_MODE_OPTIONS.filter((option) => option.id !== 'geomap')
    : VIEW_MODE_OPTIONS;
  const effectiveViewMode: ViewMode = isElasticOn && viewMode === 'geomap' ? 'grid' : viewMode;

  if (showOldExperiencePage) {
    return (
      <>
        <OldExperiencePage
          onSwitch={handleTransitionSwitch}
          onToggleNewExperience={canRevertToClassicUx ? handleToggleNewExperience : undefined}
          showTransitionModal={showOldPageTransitionModal}
          newExperienceEnabled={newInfraEnabled}
        />
        {isElasticOn ? <VariationSwitcher /> : null}
      </>
    );
  }

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
                : isElasticOn
                ? i18n.translate('xpack.streams.entityCentricLab.entities.titleResources', {
                    defaultMessage: 'All resources',
                  })
                : i18n.translate('xpack.streams.entityCentricLab.entities.title', {
                    defaultMessage: 'All entities',
                  })}
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
                ...(isPhase1
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
                          defaultMessage: 'Manage {thing} types',
                          values: { thing: labThing(isElasticOn) },
                        })}
                      </EuiButton>,
                    ]),
                ...(isElasticOn
                  ? [
                      <EuiTourStep
                        key="save-view-tour"
                        step={4}
                        stepsTotal={tourStepCount}
                        isStepOpen={isTourActive && tourStep === 4}
                        subtitle="New infrastructure inventory"
                        title="Save and share views"
                        content={
                          <p>
                            Capture your current filters, grouping, and layout as a saved view.
                            Access it from the left nav or share the link with your team.
                          </p>
                        }
                        onFinish={closeTour}
                        footerAction={
                          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <EuiButtonEmpty size="s" onClick={closeTour}>
                                Close tour
                              </EuiButtonEmpty>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiButton size="s" onClick={advanceTour}>
                                Next
                              </EuiButton>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        }
                        anchorPosition="downRight"
                      >
                        <SaveViewButton
                          currentState={currentViewState}
                          loadedView={loadedView}
                          isModified={isLoadedViewModified}
                          onUpdate={handleUpdateLoadedView}
                          onSaveAsNew={handleSaveAsNewView}
                          showMakeDefault
                          isLoadedViewDefault={
                            Boolean(loadedView) &&
                            savedViewsApi.defaultViewId === loadedView?.id
                          }
                          compact
                          neutral
                          disabled={isCategoryEmptyState}
                        />
                      </EuiTourStep>,
                      <EuiTourStep
                        key="more-actions-tour"
                        step={5}
                        stepsTotal={tourStepCount}
                        isStepOpen={isTourActive && tourStep === 5}
                        subtitle="New infrastructure inventory"
                        title="Help us improve"
                        content={
                          <p>
                            Have feedback? Found something that could work better? Let us know —
                            your input shapes what comes next.
                            {scenarioVariation !== 'banner-user' ? (
                              <> You can switch back to the classic
                              view anytime from <strong>Advanced Settings &gt; Observability</strong>.</>
                            ) : null}
                          </p>
                        }
                        onFinish={closeTour}
                        footerAction={
                          <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                            <EuiFlexItem grow={false}>
                              <EuiButtonEmpty size="s" onClick={closeTour}>
                                Close tour
                              </EuiButtonEmpty>
                            </EuiFlexItem>
                            <EuiFlexItem grow={false}>
                              <EuiButton size="s" onClick={closeTour}>
                                Done
                              </EuiButton>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        }
                        anchorPosition="downRight"
                      >
                        <MoreActionsMenu
                          onPlayTour={startScenarioTour}
                          newExperienceEnabled={
                            canRevertToClassicUx ? newInfraEnabled : undefined
                          }
                          onToggleNewExperience={
                            canRevertToClassicUx
                              ? handleToggleNewExperience
                              : undefined
                          }
                        />
                      </EuiTourStep>,
                    ]
                  : []),
              ]
        }
      />
      <StreamsAppPageTemplate.Body>
        {dataset.totalBeforeTruncation && filteredEntities.length >= dataset.totalEntities ? (
          <>
            <EuiCallOut
              title={i18n.translate(
                'xpack.streams.entityCentricLab.allEntities.truncationBanner',
                {
                  defaultMessage:
                    'We can only show 10,000 resources at a time. Use filters to slice and dice further your data.',
                }
              )}
              color="warning"
              iconType="warning"
              size="s"
            />
            <EuiSpacer size="s" />
          </>
        ) : null}
        <EuiFlexGroup gutterSize="l" alignItems="flexStart" responsive={false}>
          <EuiFlexItem>
            {showOverviewTab ? (
              categoryScope ? (
                isDemoEmptyCategoryPage ? (
                  <AddObservabilityDataEmptyPrompt categoryScope={categoryScope} />
                ) : (
                  <MonitoringAssetsView
                    category={categoryScope}
                    onSelectEntity={openEntity}
                    scopeLabel={cloudProviderScope ? headerLabel : undefined}
                    dataStreamNameIncludes={cloudStreamMatch}
                  />
                )
              ) : (
                <AllEntitiesOverviewView onSelectEntity={openEntity} />
              )
            ) : showAddDataEmptyPrompt ? (
              <AddObservabilityDataEmptyPrompt categoryScope={categoryScope} />
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
                <EuiTourStep
                  step={1}
                  stepsTotal={tourStepCount}
                  isStepOpen={isTourActive && tourStep === 1}
                  subtitle="New infrastructure inventory"
                  title="Search and filter"
                  content={
                    <p>
                      {isPhase1
                        ? 'Filter resources by name, team, or category-specific attributes using KQL. Add structured filters with the + button.'
                        : 'Filter resources by name, health, team, or category-specific attributes using KQL. Add structured filters with the + button.'}
                    </p>
                  }
                  onFinish={closeTour}
                  footerAction={
                    <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                      <EuiFlexItem grow={false}>
                        <EuiButtonEmpty size="s" onClick={closeTour}>
                          Close tour
                        </EuiButtonEmpty>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiButton size="s" onClick={advanceTour}>
                          Next
                        </EuiButton>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                  anchorPosition="downCenter"
                >
                  <div css={NO_GROW}>
                    <EuiFlexGroup gutterSize="xs" alignItems="center" responsive={false}>
                      <EuiFlexItem>
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
                          commonlyUsedRanges={inventoryCommonlyUsedRanges}
                          placeholder={i18n.translate(
                            'xpack.streams.entityCentricLab.entities.searchBarPlaceholder',
                            {
                              defaultMessage:
                                'Search {things} — e.g. {example}',
                              values: {
                                things: labThings(isElasticOn),
                                example:
                                  effectiveCategoryScope === 'kubernetes'
                                    ? 'cluster:prod* AND namespace:payments'
                                    : effectiveCategoryScope === 'hosts'
                                    ? isPhase1
                                      ? 'os:linux AND type:host'
                                      : 'os:linux AND health:unhealthy'
                                    : effectiveCategoryScope === 'cloud'
                                    ? isPhase1
                                      ? 'cloud.provider:aws'
                                      : 'cloud.provider:aws AND health:unhealthy'
                                    : isPhase1
                                    ? 'environment:production'
                                    : 'health:unhealthy AND environment:production',
                              },
                            }
                          )}
                        />
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs" color="subdued">
                          {i18n.translate(
                            'xpack.streams.entityCentricLab.entities.dateRange.maxHint',
                            { defaultMessage: 'Max 3 days' }
                          )}
                        </EuiText>
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  </div>
                </EuiTourStep>
                <EuiSpacer size="xs" />
                <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false} wrap css={NO_GROW}>
                  {getVisibleTagKeys(isElasticOn, isPhase1).length > 0 ? (
                    <EuiFlexItem grow={false}>
                      <EntitiesTagFilters
                        facets={tagFacets}
                        activeFilters={activeTagFilters}
                        onChange={setActiveTagFilters}
                        compressed
                        hideClear
                        isElasticOn
                        isPhase1={isPhase1}
                      />
                    </EuiFlexItem>
                  ) : null}
                  {isCrossCategoryPage && categoriesWithEntities.length >= 2 ? (
                    <EuiFlexItem grow={false}>
                      <EuiComboBox
                        compressed
                        singleSelection={{ asPlainText: true }}
                        options={categoriesWithEntities.map((c) => ({
                          label: c.label,
                          value: c.id,
                        }))}
                        selectedOptions={
                          categoryFilter === CATEGORY_FILTER_ALL
                            ? []
                            : categoriesWithEntities
                                .filter((c) => c.id === categoryFilter)
                                .map((c) => ({ label: `Category: ${c.label}`, value: c.id }))
                        }
                        onChange={(selected) => {
                          handleCategoryFilterChange(
                            selected.length > 0 ? (selected[0].value as string) : CATEGORY_FILTER_ALL
                          );
                        }}
                        placeholder={i18n.translate(
                          'xpack.streams.entityCentricLab.entities.categoryFilter.placeholder',
                          { defaultMessage: 'All categories' }
                        )}
                        isClearable
                        aria-label={i18n.translate(
                          'xpack.streams.entityCentricLab.entities.categoryFilter.ariaLabel',
                          { defaultMessage: 'Filter resources by category' }
                        )}
                        data-test-subj="entityCentricLabCategoryFilter"
                        style={{ minWidth: 150 }}
                      />
                    </EuiFlexItem>
                  ) : null}
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
                  {isCloudCategoryPage ? (
                    <EuiFlexItem grow={false}>
                      <CloudProviderFilter
                        value={cloudProviderFilter}
                        onChange={setCloudProviderFilter}
                      />
                    </EuiFlexItem>
                  ) : null}
                  {showK8sFilters ? (
                    <EuiFlexItem grow={false}>
                      <EuiFlexGroup gutterSize="none" alignItems="center" responsive={false} css={k8sFilterGroupCss}>
                        <EuiFlexItem grow={false}>
                          <KubernetesResourceTypeFilter
                            value={k8sResourceType}
                            onChange={handleK8sResourceTypeChange}
                          />
                        </EuiFlexItem>
                        {k8sFilterVisibility.showCluster && k8sClusterNames.length > 0 ? (
                          <EuiFlexItem grow={false}>
                            <KubernetesClusterFilter
                              clusterNames={k8sClusterNames}
                              value={k8sClusterFilter}
                              onChange={handleK8sClusterChange}
                            />
                          </EuiFlexItem>
                        ) : null}
                        {k8sFilterVisibility.showNode && k8sNodeNames.length > 0 ? (
                          <EuiFlexItem grow={false}>
                            <KubernetesNodeFilter
                              nodeNames={k8sNodeNames}
                              value={effectiveK8sNodeFilter}
                              onChange={setK8sNodeFilter}
                            />
                          </EuiFlexItem>
                        ) : null}
                        {k8sFilterVisibility.showNamespace && k8sNamespaceNames.length > 0 ? (
                          <EuiFlexItem grow={false}>
                            <KubernetesNamespaceFilter
                              namespaceNames={k8sNamespaceNames}
                              value={effectiveK8sNamespaceFilter}
                              onChange={handleK8sNamespaceChange}
                            />
                          </EuiFlexItem>
                        ) : null}
                        {k8sFilterVisibility.showDeployment && k8sDeploymentNames.length > 0 ? (
                          <EuiFlexItem grow={false}>
                            <KubernetesDeploymentFilter
                              deploymentNames={k8sDeploymentNames}
                              value={effectiveK8sDeploymentFilter}
                              onChange={setK8sDeploymentFilter}
                            />
                          </EuiFlexItem>
                        ) : null}
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  ) : null}
                  {showCategoryTypeFilter ? (
                    <EuiFlexItem grow={false}>
                      <CategoryResourceTypeFilter
                        typeLabels={categoryTypeLabels}
                        value={categoryTypeFilter}
                        onChange={setCategoryTypeFilter}
                      />
                    </EuiFlexItem>
                  ) : null}
                  {isElasticOn ? (
                    <EuiFlexItem grow={false}>
                      <EntityAlertsFilter value={alertsFilter} onChange={handleAlertsFilterChange} />
                    </EuiFlexItem>
                  ) : null}
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
                <EuiSpacer size="s" />
                {!showOverviewTab && !showAddDataEmptyPrompt ? (
                  <>
                    <InventorySummaryCards
                      entities={filteredEntitiesAfterCategoryType}
                      thingsLabel={labThingsLabel(isElasticOn)}
                      scopeKey={inventorySummaryScopeKey}
                      alertsFilter={alertsFilter}
                      onAlertsFilterChange={handleAlertsFilterChange}
                      charts={charts}
                      density={listDensity}
                    />
                    <EuiSpacer size="s" />
                  </>
                ) : null}
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                  wrap
                  css={NO_GROW}
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <h3>
                        {i18n.translate('xpack.streams.entityCentricLab.entities.summary', {
                          defaultMessage: '{count} {things} · {groups} Groups',
                          values: {
                            count: entityCountLabel,
                            things: labThingsLabel(isElasticOn),
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
                    <EuiTourStep
                      step={2}
                      stepsTotal={tourStepCount}
                      isStepOpen={isTourActive && tourStep === 2}
                      subtitle="New infrastructure inventory"
                      title="Toggle between views"
                      content={
                        <p>
                          Switch between the list view when you need to find something
                          specific and the hexagon map for an at-a-glance overview.
                        </p>
                      }
                      onFinish={closeTour}
                      footerAction={
                        <EuiFlexGroup gutterSize="s" alignItems="center" responsive={false}>
                          <EuiFlexItem grow={false}>
                            <EuiButtonEmpty size="s" onClick={closeTour}>
                              Close tour
                            </EuiButtonEmpty>
                          </EuiFlexItem>
                          <EuiFlexItem grow={false}>
                            <EuiButton size="s" onClick={advanceTour}>
                              Next
                            </EuiButton>
                          </EuiFlexItem>
                        </EuiFlexGroup>
                      }
                      anchorPosition="downCenter"
                    >
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
                    </EuiTourStep>
                  </EuiFlexItem>
                  {effectiveViewMode === 'list' || effectiveViewMode === 'grid' ? (
                    <EuiFlexItem grow={false}>
                      <ListDisplayOptionsPopover
                        density={listDensity}
                        onChange={setListDensity}
                      />
                    </EuiFlexItem>
                  ) : null}
                  <EuiFlexItem grow={false}>
                    <EntityGroupByControls
                      fields={groupByFields}
                      groupBy={groupBy}
                      onChange={setGroupBy}
                      lockedFieldIds={categoryScope ? ['category'] : []}
                      variant="link"
                      linkPrefix={i18n.translate(
                        'xpack.streams.entityCentricLab.entities.groupBy.linkLabel',
                        {
                          defaultMessage: 'Group {things} by',
                          values: { things: labThingsLabel(isElasticOn) },
                        }
                      )}
                    />
                  </EuiFlexItem>
                </EuiFlexGroup>
                <EuiHorizontalRule margin="s" />
                {isBannerScenario && !bannerDismissed ? (
                  <>
                    <EuiCallOut
                      title={'\uD83C\uDF89 Your infrastructure view has been updated'}
                      color="primary"
                    >
                      <p>
                        {scenarioVariation === 'transition'
                          ? 'You\u2019ve successfully enabled the new infrastructure experience for all users on this deployment. It brings faster load times, hex map visualizations, and richer flyout context.'
                          : scenarioVariation === 'banner-admin'
                          ? 'An admin on your team has enabled the new infrastructure experience. It brings faster load times, hex map visualizations, and richer flyout context.'
                          : 'Your team has enabled the new infrastructure experience. It brings faster load times, hex map visualizations, and richer flyout context.'}
                      </p>
                      <EuiFlexGroup gutterSize="s" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiLink onClick={startScenarioTour}>Take a tour</EuiLink>
                        </EuiFlexItem>
                        {canRevertToClassicUx ? (
                          <EuiFlexItem grow={false}>
                            <EuiLink onClick={openRevertSettings}>
                              Revert in Advanced Settings
                            </EuiLink>
                          </EuiFlexItem>
                        ) : null}
                        <EuiFlexItem grow={false}>
                          <EuiLink onClick={dismissScenarioBanner}>Dismiss</EuiLink>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiCallOut>
                    <EuiSpacer size="s" />
                  </>
                ) : null}
                <EntityErrorBoundary section="Entity view">
                {effectiveViewMode === 'grid' ? (
                  <GroupedGridView
                    key={`grid-${phaseVariation}`}
                    entities={filteredEntities}
                    onSelectEntity={openEntity}
                    selectedEntityName={selectedEntityName}
                    groupCloudByProvider={false}
                    enablePaletteColoring={isElasticOn}
                    refreshTick={refreshTick}
                    customGroupBy={customGroupBy}
                    hideCategoryHeader={!!categoryScope}
                    density={listDensity}
                    colorByTourStep={
                      isTourActive && tourStep === 3
                        ? {
                            isOpen: true,
                            step: 3,
                            stepsTotal: tourStepCount,
                            onNext: advanceTour,
                            onClose: closeTour,
                          }
                        : undefined
                    }
                  />
                ) : tableStyleVariation === 'security' ? (
                  <SecurityGroupingView
                    key={`${groupBy.join(',')}-${phaseVariation}`}
                    entities={filteredEntities}
                    onSelectEntity={openEntity}
                    onSelectEntityAlerts={openEntityOnAlertsTab}
                    groupByFields={groupByFields}
                    activeGroupBy={groupBy}
                    refreshTick={refreshTick}
                    categoryScope={categoryScope}
                    density={listDensity}
                    onK8sCellFilter={
                      enableK8sAddToFilterActions ? handleK8sInventoryCellFilter : undefined
                    }
                  />
                ) : (
                  <EntitiesListView
                    entities={filteredEntities}
                    onSelectEntity={openEntity}
                    onSelectEntityAlerts={openEntityOnAlertsTab}
                    groupCloudByProvider={false}
                    enableColumnSettings={isElasticOn}
                    refreshTick={refreshTick}
                    customGroupBy={customGroupBy}
                    hideCategoryHeader={!!categoryScope}
                    density={listDensity}
                    onK8sCellFilter={
                      enableK8sAddToFilterActions ? handleK8sInventoryCellFilter : undefined
                    }
                  />
                )}
                </EntityErrorBoundary>
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
                      isPhase1={isPhase1}
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
                      commonlyUsedRanges={inventoryCommonlyUsedRanges}
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
                        disabled={isCategoryEmptyState}
                      />
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
                <EuiSpacer size="s" />
                <EuiFlexGroup
                  alignItems="center"
                  gutterSize="s"
                  responsive={false}
                  wrap
                  css={NO_GROW}
                >
                  <EuiFlexItem grow={false}>
                    <EuiTitle size="xxs">
                      <h3>
                        {i18n.translate('xpack.streams.entityCentricLab.entities.summary', {
                          defaultMessage: '{count} {things} · {groups} Groups',
                          values: {
                            count: entityCountLabel,
                            things: labThingsLabel(isElasticOn),
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
                  {effectiveViewMode === 'list' || effectiveViewMode === 'grid' ? (
                    <EuiFlexItem grow={false}>
                      <ListDisplayOptionsPopover
                        density={listDensity}
                        onChange={setListDensity}
                      />
                    </EuiFlexItem>
                  ) : null}
                </EuiFlexGroup>
                <EuiHorizontalRule margin="s" />
                {isBannerScenario && !bannerDismissed ? (
                  <>
                    <EuiCallOut
                      title={'\uD83C\uDF89 Your infrastructure view has been updated'}
                      color="primary"
                    >
                      <p>
                        {scenarioVariation === 'transition'
                          ? 'You\u2019ve successfully enabled the new infrastructure experience for all users on this deployment. It brings faster load times, hex map visualizations, and richer flyout context.'
                          : scenarioVariation === 'banner-admin'
                          ? 'An admin on your team has enabled the new infrastructure experience. It brings faster load times, hex map visualizations, and richer flyout context.'
                          : 'Your team has enabled the new infrastructure experience. It brings faster load times, hex map visualizations, and richer flyout context.'}
                      </p>
                      <EuiFlexGroup gutterSize="s" responsive={false}>
                        <EuiFlexItem grow={false}>
                          <EuiLink onClick={startScenarioTour}>Take a tour</EuiLink>
                        </EuiFlexItem>
                        {canRevertToClassicUx ? (
                          <EuiFlexItem grow={false}>
                            <EuiLink onClick={openRevertSettings}>
                              Revert in Advanced Settings
                            </EuiLink>
                          </EuiFlexItem>
                        ) : null}
                        <EuiFlexItem grow={false}>
                          <EuiLink onClick={dismissScenarioBanner}>Dismiss</EuiLink>
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiCallOut>
                    <EuiSpacer size="s" />
                  </>
                ) : null}
                <EntityErrorBoundary section="Entity view">
                {effectiveViewMode === 'grid' ? (
                  <GroupedGridView
                    entities={filteredEntities}
                    onSelectEntity={openEntity}
                    selectedEntityName={selectedEntityName}
                    groupCloudByProvider={false}
                    enablePaletteColoring={isElasticOn}
                    refreshTick={refreshTick}
                    density={listDensity}
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
                    onSelectEntityAlerts={openEntityOnAlertsTab}
                    groupCloudByProvider={false}
                    density={listDensity}
                    onK8sCellFilter={
                      enableK8sAddToFilterActions ? handleK8sInventoryCellFilter : undefined
                    }
                  />
                )}
                </EntityErrorBoundary>
              </>
            )}
          </EuiFlexItem>
        </EuiFlexGroup>
      </StreamsAppPageTemplate.Body>
      {selectedEntityName ? (
        <EntityErrorBoundary section="Entity detail">
        <EntityFlyoutServicesProvider services={flyoutServices}>
          <EntityFlyout
            session="start"
            size={flyoutSize}
            entityName={selectedEntityName}
            entityType={selectedEntityType}
            entityHealth={selectedEntityHealth}
            region={selectedEntityRegion}
            onClose={closeEntity}
            onSelectEntity={openChildEntity}
            onNavigateEntity={openEntity}
            onManageEntityType={
              isInfraShortTerm || isPhase1 ? undefined : () => manageEntityType(selectedEntity)
            }
            minimalTabs={isInfraShortTerm}
            onExpand={
              detailVariation === 'flyoutExpandable' ? handleExpandToFullPage : undefined
            }
            hideHealthBadge={isPhase1}
            alertsBadge={isPhase1 ? computeAlertsBadge(selectedEntity) : undefined}
            alertsActiveCount={
              isPhase1 ? inventoryAlertsActiveOverride(selectedEntity) : undefined
            }
            podPhaseBadge={podPhaseBadgeForEntity(selectedEntity)}
            timeRange={flyoutTimeRange}
            hideAiSummary={isPhase1}
            hideOwnership={isPhase1}
            hideEvents={isPhase1}
            hiddenTabIds={isPhase1 ? ['custom', 'relationships', 'profiling'] : undefined}
            dashboardStyle={dashboardStyleVariation}
            showDashboardThumbnails={showDashboardThumbnails}
            tabIntent={flyoutTabIntent}
            onTabChange={handleFlyoutTabChange}
            onTimeRangeChange={handleFlyoutTimeRangeChange}
            onAddToFilter={
              enableK8sAddToFilterActions && selectedEntity?.category === 'kubernetes'
                ? () => handleAddToK8sFilter(selectedEntity)
                : undefined
            }
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
                isInfraShortTerm || isPhase1 ? undefined : () => manageEntityType(childEntity)
              }
              minimalTabs={isInfraShortTerm}
              hideHealthBadge={isPhase1}
              alertsBadge={isPhase1 ? computeAlertsBadge(childEntity) : undefined}
              alertsActiveCount={
                isPhase1 ? inventoryAlertsActiveOverride(childEntity) : undefined
              }
              podPhaseBadge={podPhaseBadgeForEntity(childEntity)}
              timeRange={flyoutTimeRange}
              onTimeRangeChange={handleFlyoutTimeRangeChange}
              hideAiSummary={isPhase1}
              hideOwnership={isPhase1}
              hideEvents={isPhase1}
              hiddenTabIds={isPhase1 ? ['custom', 'relationships', 'profiling'] : undefined}
              dashboardStyle={dashboardStyleVariation}
              showDashboardThumbnails={showDashboardThumbnails}
            />
          ) : null}
          {alertDetailRequest && renderAlertDetailFlyout ? (
            <EntityLabAlertDetailFlyoutHost
              request={alertDetailRequest}
              onClose={closeAlertDetail}
              renderAlertDetailFlyout={renderAlertDetailFlyout}
            />
          ) : null}
          {alertDetailRequest && !renderAlertDetailFlyout ? (
            <EntityLabAlertDetailMockFlyout
              alertRow={alertDetailRequest.alertRow}
              entityName={alertDetailRequest.entityName}
              onClose={closeAlertDetail}
            />
          ) : null}
          {ruleDetailRequest ? (
            <EntityLabRuleSummaryFlyout
              key={ruleDetailRequest.ruleId}
              request={ruleDetailRequest}
              onClose={closeRuleDetail}
            />
          ) : null}
        </EntityFlyoutServicesProvider>
        </EntityErrorBoundary>
      ) : null}
      {showAddDataOverlay ? (
        <AddDataOverlay onClose={() => setShowAddDataOverlay(false)} />
      ) : null}
      {isElasticOn ? <VariationSwitcher /> : null}
    </>
  );
};

/**
 * Public wrapper that places the {@link VariationProvider} above the
 * view so `useVariation` hooks inside can read URL-backed variation
 * state. The provider must be above the inner component because React
 * context requires providers to be ancestors of consumers.
 */
export const AllEntitiesView = (props: AllEntitiesViewProps) => (
  <VariationProvider>
    <AllEntitiesViewInner {...props} />
  </VariationProvider>
);
