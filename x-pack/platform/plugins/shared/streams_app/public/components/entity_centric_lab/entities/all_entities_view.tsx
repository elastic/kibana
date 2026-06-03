/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
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
import type { ActiveTagFilters, EntityCategoryId } from './fake_entities';
import {
  EMPTY_TAG_FILTERS,
  buildFakeEntities,
  getCategoryDescriptor,
  getTagFacets,
  matchesTagFilters,
} from './fake_entities';
import { GroupedGridView } from './grouped_grid_view';
import { EntitiesListView } from './entities_list_view';
import { EntitiesTagFilters } from './entities_tag_filters';

type ViewMode = 'grid' | 'list';

/**
 * localStorage key for the user's last-used Grouped grid / List choice.
 * Bumped to v1 to claim a stable key — old keys (if we ever change the
 * shape) can be invalidated by bumping the suffix.
 */
const VIEW_MODE_STORAGE_KEY = 'entityCentricLab.entitiesViewMode.v1';

const isViewMode = (value: unknown): value is ViewMode => value === 'grid' || value === 'list';

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
      start: { charts },
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
  const [selectedEntityName, setSelectedEntityName] = useState<string | null>(null);

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

  /**
   * Single funnel through which every entity-name click — grid tile,
   * list row, Dependencies row inside an already-open flyout — has to
   * go before the flyout is opened (or swapped). Honours the
   * per-entity-type enablement switch in "Manage entity types": when
   * the resolved type is disabled, the click silently no-ops instead of
   * opening / replacing the flyout. We synchronously read
   * `isEntityTypeEnabled` rather than the hook so the gate stays in
   * sync without re-creating the callback on every store change.
   */
  const openEntity = useCallback(
    (entityName: string) => {
      const matched = entityByName.get(entityName);
      const entityTypeId = resolveEntityTypeIdForName(entityName, matched?.type);
      if (!isEntityTypeEnabled(entityTypeId)) return;
      setSelectedEntityName(entityName);
    },
    [entityByName]
  );

  const closeEntity = useCallback(() => setSelectedEntityName(null), []);

  // Resolve the canonical kind for the entity currently displayed in the
  // flyout, then map that to the `FakeEntityType.id` of the corresponding
  // row in "Manage entity types" so the cog can deep-link to its edit
  // form. Falls back to the cross-category list when no mapping exists
  // (e.g. an inferred-kind entity like `'middleware'` or `'llm'` that
  // doesn't have a mock row yet) — the user still lands on the right
  // page, just without a pre-opened flyout.
  const selectedEntityKind: EntityKind | undefined = selectedEntity
    ? entityTypeToKind(selectedEntity.type) ?? inferEntityKind(selectedEntity.name)
    : undefined;

  const handleManageEntityType = useCallback(() => {
    // Prefer the exact row whose `name` matches the entity's `.type`
    // (e.g. `Bare-metal` → `bare-metal-host`, `K8s namespace` →
    // `k8s-namespace`). Fall back to the kind-level mapping for
    // legacy / inferred-only kinds, and to the cross-category list
    // when neither lookup yields a hit.
    const editId =
      findEntityTypeIdByName(selectedEntity?.type) ??
      (selectedEntityKind ? KIND_TO_FALLBACK_ENTITY_TYPE_ID[selectedEntityKind] : undefined);
    router.push('/manage-entity-types', {
      path: {},
      query: editId ? { edit: editId } : {},
    });
  }, [selectedEntity, selectedEntityKind, router]);

  // `agentBuilder` is intentionally undefined: streams_app does not declare it
  // as a start dependency. The shared flyout hides the "Add to chat" button
  // when this is omitted, so the rest of the UI keeps working.
  const flyoutServices = useMemo(() => ({ notifications, charts }), [notifications, charts]);

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
        {/*
          Search + time picker share one row to keep the page top compact.
          `NO_GROW` is applied to the wrapper so the row stays at content
          height when the body shrinks (same trick as the toolbar below —
          see the `NO_GROW` definition for the rationale).
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
            <EuiSuperDatePicker
              start={rangeFrom}
              end={rangeTo}
              onTimeChange={handleTimeChange}
              onRefresh={handleTimeRefresh}
              showUpdateButton="iconOnly"
              data-test-subj="entityCentricLabEntitiesTimePicker"
            />
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiSpacer size="s" />
        <EntitiesTagFilters
          facets={tagFacets}
          activeFilters={activeTagFilters}
          onChange={setActiveTagFilters}
        />
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
              legend={i18n.translate('xpack.streams.entityCentricLab.entities.viewMode.legend', {
                defaultMessage: 'View mode',
              })}
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
        ) : (
          <EntitiesListView entities={filteredEntities} onSelectEntity={openEntity} />
        )}
      </StreamsAppPageTemplate.Body>
      {selectedEntityName ? (
        <EntityFlyoutServicesProvider services={flyoutServices}>
          <EntityFlyout
            entityName={selectedEntityName}
            entityType={selectedEntityType}
            entityHealth={selectedEntityHealth}
            onClose={closeEntity}
            onSelectEntity={openEntity}
            onManageEntityType={handleManageEntityType}
          />
        </EntityFlyoutServicesProvider>
      ) : null}
    </>
  );
};
