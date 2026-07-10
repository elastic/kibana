/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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

import {
  EntityFlyout,
  EntityFlyoutServicesProvider,
  entityTypeToKind,
  inferEntityKind,
  isEntityTypeEnabled,
  resolveEntityTypeIdForName,
  type EntityKind,
  type EntitySelectionContext,
} from '@kbn/entity-centric-lab-flyout';
import { FAKE_ENTITY_TYPES } from '../fake_entity_types';

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
import {
  EMPTY_TAG_FILTERS,
  buildFakeEntities,
  getCategoryDescriptor,
  getTagFacets,
  matchesTagFilters,
} from './fake_entities';
import { GroupedGridView } from './grouped_grid_view';
import { EntitiesListView } from './entities_list_view';
import { GeomapView } from './geomap_view';
import { ServiceMapView } from './service_map_view';
import { EntitiesTagFilters } from './entities_tag_filters';
import { MonitoringAssetsView } from './monitoring_assets_view';

/**
 * Tabs shown on the category-scoped pages. `inventory` is the existing
 * search / filter / grid-list-geomap surface; `monitoring` swaps the body
 * for the integration-driven Monitoring assets view. The cross-category
 * `/entities` page has no tabs (monitoring assets are curated per
 * integration, which only makes sense once scoped to one category).
 */
type CategoryTab = 'inventory' | 'monitoring';

type ViewMode = 'grid' | 'list' | 'geomap' | 'servicemap';

/**
 * localStorage key for the user's last-used Grouped grid / List choice.
 * Bumped to v1 to claim a stable key — old keys (if we ever change the
 * shape) can be invalidated by bumping the suffix.
 */
const VIEW_MODE_STORAGE_KEY = 'entityCentricLab.entitiesViewMode.v1';

const isViewMode = (value: unknown): value is ViewMode =>
  value === 'grid' || value === 'list' || value === 'geomap' || value === 'servicemap';

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
    id: 'servicemap' as const,
    label: i18n.translate('xpack.streams.entityCentricLab.entities.viewMode.serviceMap', {
      defaultMessage: 'Service map',
    }),
    iconType: 'graphApp',
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
}

export const AllEntitiesView = ({ categoryScope }: AllEntitiesViewProps = {}) => {
  const router = useStreamsAppRouter();
  const {
    core: { notifications },
    dependencies: {
      start: { agentBuilder, charts },
    },
  } = useKibana();
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

  const dataset = useMemo(() => buildFakeEntities(), []);
  // Narrow the dataset to the active category once, then drive every
  // downstream concern (facets, summary, grid, list, flyout context) off
  // the same slice. Doing the filter here — rather than at each consumer —
  // keeps the rest of the component identical to the un-scoped All
  // entities page.
  const scopedEntities = useMemo(
    () =>
      categoryScope
        ? dataset.entities.filter((entity) => entity.category === categoryScope)
        : dataset.entities,
    [dataset.entities, categoryScope]
  );
  // Tag facets must be computed from the visible slice. If we kept them
  // global, a scoped page would show filter options that always empty the
  // grid (e.g. "Application: ml-platform" on the Databases page when no
  // database is tagged with that application).
  const tagFacets = useMemo(() => getTagFacets(scopedEntities), [scopedEntities]);
  const categoryDescriptor = categoryScope ? getCategoryDescriptor(categoryScope) : undefined;
  const [search, setSearch] = useState('');
  const [activeTagFilters, setActiveTagFilters] = useState<ActiveTagFilters>(EMPTY_TAG_FILTERS);
  const [viewMode, setViewMode] = useEntitiesViewMode();
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
  const selectedEntityNameRef = useRef<string | null>(null);
  useEffect(() => {
    selectedEntityNameRef.current = selectedEntityName;
  }, [selectedEntityName]);
  // Category pages get an Inventory / Monitoring assets tab strip; the
  // cross-category page stays single-surface. Reset to Inventory on every
  // mount (each nav remounts this component) so a category page always
  // opens on its entity list.
  const [categoryTab, setCategoryTab] = useState<CategoryTab>('inventory');
  const showMonitoringTab = Boolean(categoryScope) && categoryTab === 'monitoring';

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
   * tile, list row, geomap donut, service-map node). Opens the parent
   * flyout when nothing is open yet; once a parent is open, a click on a
   * *different* entity opens it as a child flyout beside the parent —
   * this is what lets a service-map node click dock a child flyout while
   * the map stays visible behind the non-modal flyout.
   */
  const openEntity = useCallback(
    (entityName: string, context?: EntitySelectionContext) => {
      if (!isEntityOpenable(entityName)) return;
      const currentMain = selectedEntityNameRef.current;
      if (!currentMain) {
        setSelectedEntityName(entityName);
      } else if (currentMain !== entityName) {
        setChildEntityName(entityName);
        setChildEntityContext(context ?? null);
      }
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
  const handleSelectRegion = useCallback((region: string) => {
    setActiveTagFilters((prev) => {
      const isSoleActive = prev.region.length === 1 && prev.region[0] === region;
      return { ...prev, region: isSoleActive ? [] : [region] };
    });
  }, []);

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

  // `agentBuilder` is an *optional* start dep on Streams — when it's
  // available (most environments) the shared flyout's "Add to chat"
  // footer button lights up and the entity context is forwarded to the
  // AI chat with the same payload Discover uses. When it's missing the
  // button is hidden and the rest of the flyout keeps working.
  const flyoutServices = useMemo(
    () => ({ agentBuilder, notifications, charts }),
    [agentBuilder, notifications, charts]
  );

  return (
    <>
      <StreamsAppPageTemplate.Header
        pageTitle={
          <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
            {categoryDescriptor?.icon ? (
              <EuiFlexItem grow={false}>
                <EuiIcon type={categoryDescriptor.icon} size="l" aria-hidden />
              </EuiFlexItem>
            ) : null}
            <EuiFlexItem grow={false}>
              {categoryDescriptor
                ? i18n.translate('xpack.streams.entityCentricLab.entities.categoryTitle', {
                    defaultMessage: '{label} ({count})',
                    values: {
                      label: categoryDescriptor.label,
                      count: filteredEntities.length.toLocaleString(),
                    },
                  })
                : i18n.translate('xpack.streams.entityCentricLab.entities.title', {
                    defaultMessage: 'All entities ({count})',
                    values: { count: filteredEntities.length.toLocaleString() },
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
          categoryScope
            ? [
                {
                  label: i18n.translate('xpack.streams.entityCentricLab.entities.tabs.inventory', {
                    defaultMessage: 'Inventory ({count})',
                    values: { count: scopedEntities.length.toLocaleString() },
                  }),
                  isSelected: categoryTab === 'inventory',
                  onClick: () => setCategoryTab('inventory'),
                  'data-test-subj': 'entityCentricLabInventoryTab',
                },
                {
                  label: i18n.translate(
                    'xpack.streams.entityCentricLab.entities.tabs.monitoringAssets',
                    { defaultMessage: 'Integrations' }
                  ),
                  isSelected: categoryTab === 'monitoring',
                  onClick: () => setCategoryTab('monitoring'),
                  'data-test-subj': 'entityCentricLabMonitoringAssetsTab',
                },
              ]
            : undefined
        }
        rightSideItems={[
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
        ]}
      />
      <StreamsAppPageTemplate.Body>
        {showMonitoringTab && categoryScope ? (
          <MonitoringAssetsView category={categoryScope} />
        ) : (
          <>
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
            <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap css={NO_GROW}>
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
              <GroupedGridView entities={filteredEntities} onSelectEntity={openEntity} />
            ) : viewMode === 'geomap' ? (
              <GeomapView
                entities={filteredEntities}
                onSelectEntity={openEntity}
                onSelectRegion={handleSelectRegion}
              />
            ) : viewMode === 'servicemap' ? (
              <ServiceMapView entities={filteredEntities} onSelectEntity={openEntity} />
            ) : (
              <EntitiesListView entities={filteredEntities} onSelectEntity={openEntity} />
            )}
          </>
        )}
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
            onManageEntityType={() => manageEntityType(selectedEntity)}
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
              onManageEntityType={() => manageEntityType(childEntity)}
            />
          ) : null}
        </EntityFlyoutServicesProvider>
      ) : null}
    </>
  );
};
