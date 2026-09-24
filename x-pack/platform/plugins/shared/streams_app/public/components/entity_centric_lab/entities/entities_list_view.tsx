/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiHorizontalRule,
  EuiIcon,
  EuiInMemoryTable,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  type EuiBasicTableColumn,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import {
  getEffectiveEntityHealth,
  useChaosModeEnabled,
  useEntityDisplayName,
} from '@kbn/entity-centric-lab-flyout';
import type { Entity, EntityCategoryId, EntityHealth } from './fake_entities';
import {
  HEALTH_RANK,
  getCategoryDescriptor,
  getVisibleEntityCategories,
  isCategoryHiddenInElasticOn,
} from './fake_entities';
import { labThings } from '../lab_terminology';
import { readPageSizeForTable, writePageSizeForTable } from './storage_keys';
import { CLOUD_PROVIDERS, type CloudProviderDescriptor } from './cloud_providers';
import { EntityDataGridSection } from './entities_data_grid';
import { UNGROUPED_LABEL, groupEntities, type GroupByFieldDef } from './entity_group_by';
import {
  CATEGORY_RESOURCE_TYPE_ALL,
  CategoryResourceTypeFilter,
  KUBERNETES_FILTER_ALL,
  KUBERNETES_RESOURCE_TYPE_ALL,
  KUBERNETES_SUB_TYPE_ORDER,
  KubernetesClusterFilter,
  KubernetesResourceTypeFilter,
  filterEntitiesByResourceType,
  filterEntitiesByCategoryType,
  filterKubernetesEntities,
  getEntityTypeLabels,
  getKubernetesClusterNames,
  getTypeGroupForSubType,
  type KubernetesResourceType,
} from './kubernetes_cluster_filter';

interface Props {
  readonly entities: readonly Entity[];
  readonly onSelectEntity: (entityName: string) => void;
  /**
   * When true, Cloud entities are grouped by provider (AWS / GCP /
   * Azure) then by service; when false, Cloud groups flat by type.
   * Driven by the discreet toolbar toggle (`useCloudHierarchyEnabled`).
   */
  readonly groupCloudByProvider?: boolean;
  /**
   * ElasticOn only: render each table as an `EuiDataGrid` with native
   * per-table column controls (reorder / show-hide / add columns) plus a
   * "Reset to default" control. Other modes keep the classic
   * `EuiInMemoryTable`.
   */
  readonly enableColumnSettings?: boolean;
  /** Bumped by the ElasticOn auto-refresh tick so live metric cells re-roll. */
  readonly refreshTick?: number;
  /**
   * ElasticOn "Group by" override. When set (a non-default grouping of 1–2
   * fields), the list groups by those fields instead of Category → Type: one
   * section per level-1 bucket, one table panel per level-2 bucket (or per
   * level-1 bucket when a single field is active). Undefined keeps the
   * built-in layout untouched.
   */
  readonly customGroupBy?: readonly GroupByFieldDef[];
  /**
   * When true the outer category headers are omitted because the
   * page is already scoped to a single category and the title + count
   * are shown in the page header. Sub-type tables still render.
   */
  readonly hideCategoryHeader?: boolean;
}

const HEALTH_BADGE_COLOR: Record<EntityHealth, 'success' | 'warning' | 'danger'> = {
  healthy: 'success',
  atRisk: 'warning',
  unhealthy: 'danger',
};

const HEALTH_LABEL: Record<EntityHealth, string> = {
  healthy: i18n.translate('xpack.streams.entityCentricLab.entities.list.health.healthy', {
    defaultMessage: 'Healthy',
  }),
  atRisk: i18n.translate('xpack.streams.entityCentricLab.entities.list.health.atRisk', {
    defaultMessage: 'At risk',
  }),
  unhealthy: i18n.translate('xpack.streams.entityCentricLab.entities.list.health.unhealthy', {
    defaultMessage: 'Unhealthy',
  }),
};

const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

const useColumns = (
  onSelectEntity: (entityName: string) => void
): Array<EuiBasicTableColumn<Entity>> =>
  useMemo(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.streams.entityCentricLab.entities.list.columns.name', {
          defaultMessage: 'Entity name',
        }),
        sortable: true,
        render: (_name: string, row: Entity) => (
          <EntityNameLink entity={row} onSelectEntity={onSelectEntity} />
        ),
      },
      {
        field: 'health',
        name: i18n.translate('xpack.streams.entityCentricLab.entities.list.columns.health', {
          defaultMessage: 'Health',
        }),
        width: '120px',
        // Sort by severity (unhealthy → atRisk → healthy), not the raw
        // health string (which alphabetizes to atRisk → healthy →
        // unhealthy). Ascending now surfaces the most anomalous rows
        // first, matching the default sort applied below.
        sortable: (row: Entity) => HEALTH_RANK[row.health],
        render: (health: EntityHealth) => (
          <EuiBadge color={HEALTH_BADGE_COLOR[health]}>{HEALTH_LABEL[health]}</EuiBadge>
        ),
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.entities.list.columns.alerts', {
          defaultMessage: 'Alerts',
        }),
        width: '150px',
        sortable: (row: Entity) => {
          if (!row.alerts) return 2;
          return row.alerts.active > 0 ? 0 : 1;
        },
        render: (row: Entity) => {
          if (!row.alerts) return <EuiBadge color="hollow">N/A</EuiBadge>;
          const { total, active } = row.alerts;
          if (active > 0) {
            return <EuiBadge color="danger">{`Alerting (${active}/${total})`}</EuiBadge>;
          }
          return <EuiBadge color="success">{`OK (${total}/${total})`}</EuiBadge>;
        },
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.entities.list.columns.application', {
          defaultMessage: 'Application',
        }),
        width: '140px',
        sortable: (row: Entity) => row.tags.application,
        render: (row: Entity) => <EuiBadge color="hollow">{row.tags.application}</EuiBadge>,
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.entities.list.columns.environment', {
          defaultMessage: 'Environment',
        }),
        width: '120px',
        sortable: (row: Entity) => row.tags.environment,
        render: (row: Entity) => <EuiBadge color="hollow">{row.tags.environment}</EuiBadge>,
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.entities.list.columns.team', {
          defaultMessage: 'Team',
        }),
        width: '140px',
        sortable: (row: Entity) => row.tags.team,
        render: (row: Entity) => <EuiBadge color="hollow">{row.tags.team}</EuiBadge>,
      },
      {
        name: i18n.translate('xpack.streams.entityCentricLab.entities.list.columns.region', {
          defaultMessage: 'Region',
        }),
        width: '120px',
        sortable: (row: Entity) => row.tags.region,
        render: (row: Entity) => <EuiBadge color="hollow">{row.tags.region}</EuiBadge>,
      },
      {
        field: 'lastHealthChange',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.entities.list.columns.lastHealthChange',
          { defaultMessage: 'Last health change' }
        ),
        width: '180px',
        sortable: true,
      },
      {
        field: 'age',
        name: i18n.translate('xpack.streams.entityCentricLab.entities.list.columns.age', {
          defaultMessage: 'Age',
        }),
        width: '120px',
      },
      {
        field: 'anomalyDetection',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.entities.list.columns.anomalyDetection',
          { defaultMessage: 'Anomaly detection' }
        ),
      },
    ],
    [onSelectEntity]
  );

/**
 * Per-row entity link. Resolves the displayed label through the shared
 * `entity_display_config` store so the entities list automatically picks
 * up the wizard's `displayField` choice for the entity's type. The
 * actual click still navigates by the canonical `name` so the flyout
 * can do its own lookups against the dataset.
 */
const EntityNameLink = ({
  entity,
  onSelectEntity,
}: {
  entity: Entity;
  onSelectEntity: (entityName: string) => void;
}) => {
  const displayName = useEntityDisplayName(entity.name, entity.type);
  return (
    <EuiLink
      data-test-subj={`entityCentricLabEntityRow-${entity.id}`}
      onClick={() => onSelectEntity(entity.name)}
    >
      <EuiIcon type="expand" size="s" style={{ marginRight: 4 }} />
      {displayName}
    </EuiLink>
  );
};

/**
 * Header rendered above a per-category section. Used by:
 *   - the Kubernetes header (which also hosts the cluster filter), and
 *   - the generic header emitted above multi-type categories like
 *     Hosts (Bare-metal + VM) and Cloud (region + EC2 + Lambda + S3).
 * Lets the per-panel headers below show *just* the sub-type label so
 * the user doesn't read the category name twice.
 */
const CategorySectionHeader = ({
  category,
  total,
  typeLabels,
  typeFilter,
  onTypeFilterChange,
}: {
  category: EntityCategoryId;
  total: number;
  typeLabels?: readonly string[];
  typeFilter?: string;
  onTypeFilterChange?: (next: string) => void;
}) => {
  const descriptor = getCategoryDescriptor(category);
  const showTypeFilter = typeLabels && typeLabels.length > 1 && typeFilter !== undefined && onTypeFilterChange;
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {descriptor?.icon ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={descriptor.icon} size="m" aria-hidden />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>{descriptor?.label ?? category}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      {showTypeFilter ? (
        <>
          <EuiFlexItem />
          <EuiFlexItem grow={false}>
            <CategoryResourceTypeFilter
              typeLabels={typeLabels}
              value={typeFilter}
              onChange={onTypeFilterChange}
            />
          </EuiFlexItem>
        </>
      ) : null}
    </EuiFlexGroup>
  );
};

const CloudProviderSectionHeader = ({
  provider,
  total,
}: {
  provider: CloudProviderDescriptor;
  total: number;
}) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiIcon type={provider.icon} size="m" aria-hidden />
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xxs">
        <h4>{provider.label}</h4>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const SectionHeader = ({
  category,
  subTypeLabel,
  total,
  /**
   * When `true`, the panel sits under a parent `CategorySectionHeader`
   * (multi-type category or Kubernetes) and the heading only needs to
   * carry the sub-type label. When `false` (single-type category) we
   * fall back to showing the category name as the heading.
   */
  nested,
}: {
  category: EntityCategoryId;
  subTypeLabel?: string;
  total: number;
  nested?: boolean;
}) => {
  const descriptor = getCategoryDescriptor(category);
  const heading = nested && subTypeLabel ? subTypeLabel : descriptor?.label ?? category;
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {descriptor?.icon && !nested ? (
        <EuiFlexItem grow={false}>
          <EuiIcon type={descriptor.icon} size="m" aria-hidden />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h4>{heading}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

const TableSection = ({
  category,
  subTypeLabel,
  nested,
  rows,
  columns,
  tableKey,
}: {
  category: EntityCategoryId;
  subTypeLabel?: string;
  nested?: boolean;
  rows: readonly Entity[];
  columns: Array<EuiBasicTableColumn<Entity>>;
  /** Stable key for per-table page-size persistence (e.g. `hosts:Linux Server`). */
  tableKey: string;
}) => {
  const descriptor = getCategoryDescriptor(category);
  const captionLabel = subTypeLabel
    ? `${descriptor?.label ?? category} · ${subTypeLabel}`
    : descriptor?.label ?? category;
  const showInPanelHeader = !nested || Boolean(subTypeLabel);

  const handleTableChange = useCallback(
    (criteria: { page?: { size: number } }) => {
      if (criteria.page) {
        writePageSizeForTable(tableKey, criteria.page.size);
      }
    },
    [tableKey]
  );

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      {showInPanelHeader && (
        <>
          <SectionHeader
            category={category}
            subTypeLabel={subTypeLabel}
            total={rows.length}
            nested={nested}
          />
          <EuiSpacer size="s" />
        </>
      )}
      <EuiInMemoryTable<Entity>
        tableCaption={i18n.translate('xpack.streams.entityCentricLab.entities.list.tableCaption', {
          defaultMessage: '{label} entities',
          values: { label: captionLabel },
        })}
        items={[...rows]}
        columns={columns}
        rowHeader="name"
        sorting={{ sort: { field: 'health', direction: 'asc' } }}
        pagination={{
          initialPageSize: readPageSizeForTable(tableKey),
          pageSizeOptions: [...PAGE_SIZE_OPTIONS],
        }}
        onTableChange={handleTableChange}
        data-test-subj={
          subTypeLabel
            ? `entityCentricLabEntitiesTable-${category}-${subTypeLabel.toLowerCase()}`
            : `entityCentricLabEntitiesTable-${category}`
        }
      />
    </EuiPanel>
  );
};

/**
 * Group entities by their `.type` string, largest groups first with
 * ties broken alphabetically — stable enough that re-renders don't
 * reshuffle the panels. Mirrors `groupEntitiesByType` in
 * `grouped_grid_view.tsx` so the list and grid views show the same
 * sub-type ordering side by side.
 */
const groupEntitiesByType = (
  entities: readonly Entity[]
): Array<{ label: string; rows: Entity[] }> => {
  const buckets = new Map<string, Entity[]>();
  for (const entity of entities) {
    const list = buckets.get(entity.type) ?? [];
    list.push(entity);
    buckets.set(entity.type, list);
  }
  return Array.from(buckets.entries())
    .map(([label, rows]) => ({ label, rows }))
    .sort((a, b) => {
      const sizeDelta = b.rows.length - a.rows.length;
      if (sizeDelta !== 0) return sizeDelta;
      return a.label.localeCompare(b.label);
    });
};

/**
 * One renderable block in the list view. Either a table panel
 * (category-wide or one sub-type), the Kubernetes section header
 * that hosts the cluster filter dropdown, or a generic category
 * header above a multi-type category's panels (Hosts, Cloud, ...).
 * Modeled as a discriminated union so the render loop stays linear
 * and the canonical category order (the order in
 * `ENTITY_CATEGORIES`) is preserved across all block types.
 *
 * `nested: true` on a panel means it sits below a category header
 * (Kubernetes or multi-type) and its `SectionHeader` should render
 * just the sub-type label — no category name repetition.
 */
type ListItem =
  | {
      kind: 'panel';
      category: EntityCategoryId;
      subTypeLabel?: string;
      nested?: boolean;
      /** Nesting depth for custom grouping indentation (0 = top, 1 = under group, 2 = under sub-group). */
      depth?: number;
      /** When true, always use the basic EuiInMemoryTable even in ElasticOn
       *  mode. Used for the flat ungrouped view where entities span multiple
       *  categories and a single bucket key can't represent them. */
      forceBasicTable?: boolean;
      rows: Entity[];
    }
  | { kind: 'kubernetes-header'; total: number }
  | { kind: 'type-group-divider'; label: string }
  | { kind: 'category-header'; category: EntityCategoryId; total: number; typeLabels?: readonly string[] }
  | { kind: 'cloud-provider-header'; provider: CloudProviderDescriptor; total: number }
  // Generic level-1 header for a custom "Group by" bucket (ElasticOn).
  | { kind: 'group-header'; label: string; total: number }
  // Level-2 sub-group header for 3-field custom grouping.
  | { kind: 'sub-group-header'; label: string; total: number };

/** A simple level-1 header for a custom-grouping bucket (no category icon). */
const GroupSectionHeader = ({ label, total }: { label: string; total: number }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="s">
        <h3>{label}</h3>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);

/** Level-2 sub-group header (smaller) for 3-field custom grouping. */
const SubGroupSectionHeader = ({ label, total }: { label: string; total: number }) => (
  <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
    <EuiFlexItem grow={false}>
      <EuiTitle size="xs">
        <h4>{label}</h4>
      </EuiTitle>
    </EuiFlexItem>
    <EuiFlexItem grow={false}>
      <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
    </EuiFlexItem>
  </EuiFlexGroup>
);

const KubernetesSectionHeader = ({
  total,
  resourceType,
  onResourceTypeChange,
  clusterNames,
  clusterFilter,
  onClusterFilterChange,
}: {
  total: number;
  resourceType: KubernetesResourceType;
  onResourceTypeChange: (next: KubernetesResourceType) => void;
  clusterNames: readonly string[];
  clusterFilter: string;
  onClusterFilterChange: (next: string) => void;
}) => {
  const descriptor = getCategoryDescriptor('kubernetes');
  return (
    <EuiFlexGroup alignItems="center" gutterSize="m" responsive={false} wrap>
      <EuiFlexItem grow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
          {descriptor?.icon ? (
            <EuiFlexItem grow={false}>
              <EuiIcon type={descriptor.icon} size="m" aria-hidden />
            </EuiFlexItem>
          ) : null}
          <EuiFlexItem grow={false}>
            <EuiTitle size="s">
              <h3>{descriptor?.label ?? 'Kubernetes'}</h3>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem />
      <EuiFlexItem grow={false}>
        <KubernetesResourceTypeFilter
          value={resourceType}
          onChange={onResourceTypeChange}
        />
      </EuiFlexItem>
      {clusterNames.length > 0 ? (
        <EuiFlexItem grow={false}>
          <KubernetesClusterFilter
            clusterNames={clusterNames}
            value={clusterFilter}
            onChange={onClusterFilterChange}
          />
        </EuiFlexItem>
      ) : null}
    </EuiFlexGroup>
  );
};

export const EntitiesListView = ({
  entities,
  onSelectEntity,
  groupCloudByProvider = false,
  enableColumnSettings = false,
  refreshTick,
  customGroupBy,
  hideCategoryHeader = false,
}: Props) => {
  const columns = useColumns(onSelectEntity);
  // `undefined` keeps the built-in Category → Type layout; an empty array means
  // "no grouping" (one flat "All entities" table); 1–2 fields drive grouping.
  const useCustomGrouping = customGroupBy !== undefined;

  // Subscribe to chaos-mode flips so PayFlow storyline rows can swap
  // their health between the seeded "unhealthy" and the rollback
  // "healthy" state without requiring a page reload. The helper is a
  // no-op for any non-storyline entity, so non-PayFlow rows keep
  // their dataset-defined health.
  const chaosOn = useChaosModeEnabled();
  const effectiveEntities = useMemo<Entity[]>(() => {
    const withHealth = entities.map((entity) => {
      const effective = getEffectiveEntityHealth(entity.name, entity.health, chaosOn);
      return effective === entity.health ? entity : { ...entity, health: effective };
    });
    if (!enableColumnSettings) return withHealth;
    return withHealth.filter((entity) => !isCategoryHiddenInElasticOn(entity.category));
  }, [entities, chaosOn, enableColumnSettings]);

  // Transient (not persisted) — on the All Resources page only resource
  // type + cluster are shown. For deeper filtering (namespace, deployment,
  // node) the user navigates to the dedicated Kubernetes section.
  const [resourceType, setResourceType] = useState<KubernetesResourceType>(KUBERNETES_RESOURCE_TYPE_ALL);
  const [clusterFilter, setClusterFilter] = useState<string>(KUBERNETES_FILTER_ALL);

  // Per-category type filter for non-K8s categories (Hosts, Databases, etc.)
  const [categoryTypeFilters, setCategoryTypeFilters] = useState<Map<EntityCategoryId, string>>(
    () => new Map()
  );
  const getCategoryTypeFilter = useCallback(
    (cat: EntityCategoryId) => categoryTypeFilters.get(cat) ?? CATEGORY_RESOURCE_TYPE_ALL,
    [categoryTypeFilters]
  );
  const setCategoryTypeFilter = useCallback(
    (cat: EntityCategoryId, value: string) => {
      setCategoryTypeFilters((prev) => {
        const next = new Map(prev);
        if (value === CATEGORY_RESOURCE_TYPE_ALL) {
          next.delete(cat);
        } else {
          next.set(cat, value);
        }
        return next;
      });
    },
    []
  );

  const k8sEntities = useMemo(
    () => effectiveEntities.filter((entity) => entity.category === 'kubernetes'),
    [effectiveEntities]
  );

  const clusterNames = useMemo(
    () => getKubernetesClusterNames(k8sEntities),
    [k8sEntities]
  );

  const items = useMemo<ListItem[]>(() => {
    // ElasticOn "Group by" override: group by the chosen 1–3 fields instead of
    // the built-in Category → Type layout. Level-1 buckets become section
    // headers; level-2 buckets become sub-headers or table panels; level-3
    // buckets (when 3 fields) become the leaf table panels.
    if (useCustomGrouping && customGroupBy) {
      // Flat / ungrouped: a single "All entities" table (nested so the header
      // shows the label, not the first entity's category name).
      if (customGroupBy.length === 0) {
        if (effectiveEntities.length === 0) return [];
        // Check if entities span multiple categories — if so, no single
        // bucket key can represent the mix, so force the basic table.
        const firstCategory = effectiveEntities[0].category;
        const isMixed = effectiveEntities.some((e) => e.category !== firstCategory);
        return [
          {
            kind: 'panel',
            category: firstCategory,
            subTypeLabel: UNGROUPED_LABEL,
            nested: true,
            forceBasicTable: isMixed,
            rows: [...effectiveEntities],
          },
        ];
      }
      const nodes = groupEntities(effectiveEntities, customGroupBy);
      const custom: ListItem[] = [];
      const hasSubLevel = customGroupBy.length > 1;
      for (const node of nodes) {
        if (hasSubLevel && node.children.length > 0) {
          custom.push({ kind: 'group-header', label: node.label, total: node.entities.length });
          for (const child of node.children) {
            if (child.children.length > 0) {
              custom.push({ kind: 'sub-group-header', label: child.label, total: child.entities.length });
              for (const grandchild of child.children) {
                custom.push({
                  kind: 'panel',
                  category: grandchild.entities[0].category,
                  subTypeLabel: grandchild.label,
                  nested: true,
                  depth: 2,
                  rows: grandchild.entities,
                });
              }
            } else {
              custom.push({
                kind: 'panel',
                category: child.entities[0].category,
                subTypeLabel: child.label,
                nested: true,
                depth: 1,
                rows: child.entities,
              });
            }
          }
        } else {
          custom.push({
            kind: 'panel',
            category: node.entities[0].category,
            subTypeLabel: node.label,
            nested: true,
            rows: node.entities,
          });
        }
      }
      return custom;
    }

    const buckets = new Map<EntityCategoryId, Entity[]>();
    for (const entity of effectiveEntities) {
      const list = buckets.get(entity.category) ?? [];
      list.push(entity);
      buckets.set(entity.category, list);
    }

    const result: ListItem[] = [];
    for (const descriptor of getVisibleEntityCategories(enableColumnSettings)) {
      const rows = buckets.get(descriptor.id);
      if (!rows || rows.length === 0) continue;
      if (descriptor.id === 'kubernetes') {
        // Always emit the K8s header — even when the cluster filter
        // ends up hiding every sub-type panel — so the user can see
        // the dropdown that's filtering them out and reset it. K8s
        // groups by `entity.subType` (Clusters / Nodes / Namespaces
        // / ...) using the curated reading order, instead of the
        // generic `.type`-based grouping used by other categories.
        const afterResourceType = filterEntitiesByResourceType(rows, resourceType);
        const filtered = filterKubernetesEntities(afterResourceType, clusterFilter, KUBERNETES_FILTER_ALL, KUBERNETES_FILTER_ALL, KUBERNETES_FILTER_ALL, clusterNames);
        result.push({ kind: 'kubernetes-header', total: filtered.length });
        const subTypeBuckets = new Map<string, Entity[]>();
        for (const entity of filtered) {
          const key = entity.subType ?? 'Other';
          const list = subTypeBuckets.get(key) ?? [];
          list.push(entity);
          subTypeBuckets.set(key, list);
        }
        const seenTypeGroups = new Set<string>();
        for (const subTypeLabel of KUBERNETES_SUB_TYPE_ORDER) {
          const subRows = subTypeBuckets.get(subTypeLabel);
          if (subRows && subRows.length > 0) {
            const typeGroup = getTypeGroupForSubType(subTypeLabel);
            if (typeGroup && !seenTypeGroups.has(typeGroup.id)) {
              seenTypeGroups.add(typeGroup.id);
              result.push({ kind: 'type-group-divider', label: typeGroup.label });
            }
            result.push({
              kind: 'panel',
              category: 'kubernetes',
              subTypeLabel,
              nested: true,
              rows: subRows,
            });
          }
        }
        continue;
      }
      if (descriptor.id === 'cloud' && groupCloudByProvider) {
        // Cloud provider hierarchy: one header per provider (AWS / GCP
        // / Azure) followed by one table panel per service, in the
        // canonical descriptor order. Empty providers/services are
        // skipped so a filtered slice stays compact.
        for (const provider of CLOUD_PROVIDERS) {
          const providerRows = rows.filter((entity) => entity.provider === provider.id);
          if (providerRows.length === 0) continue;
          result.push({ kind: 'cloud-provider-header', provider, total: providerRows.length });
          for (const service of provider.services) {
            const serviceRows = providerRows.filter((entity) => entity.type === service.entityType);
            if (serviceRows.length === 0) continue;
            result.push({
              kind: 'panel',
              category: 'cloud',
              subTypeLabel: service.label,
              nested: true,
              rows: serviceRows,
            });
          }
        }
        continue;
      }
      // Non-K8s: apply per-category type filter, then group by `.type`
      // so categories with more than one entity type (Hosts → Bare-metal
      // + VM, Messaging → Kafka + RabbitMQ, AI/ML → OpenAI + Anthropic)
      // render with a top-level category header (with an inline type
      // filter when 2+ types) and one panel per type.
      const typeLabels = getEntityTypeLabels(rows);
      const catTypeFilter = getCategoryTypeFilter(descriptor.id);
      const filteredRows = filterEntitiesByCategoryType(rows, catTypeFilter);
      const typeGroups = groupEntitiesByType(filteredRows);
      if (typeLabels.length > 1) {
        result.push({ kind: 'category-header', category: descriptor.id, total: filteredRows.length, typeLabels });
        for (const group of typeGroups) {
          result.push({
            kind: 'panel',
            category: descriptor.id,
            subTypeLabel: group.label,
            nested: true,
            rows: group.rows,
          });
        }
      } else {
        // Cloud scoped to a single service (EC2 / Lambda / S3): label the
        // panel by the service type instead of the generic "Cloud" so the
        // header (and the ElasticOn data grid's metric bucket) reflect the
        // service the page is scoped to.
        const single = rows[0];
        if (descriptor.id === 'cloud' && single?.subType) {
          result.push({
            kind: 'panel',
            category: 'cloud',
            subTypeLabel: single.type,
            nested: true,
            rows,
          });
        } else {
          // Single-type category: emit a standalone header so the
          // category name sits *above* the bordered panel, visually
          // separating it from unrelated panels above (e.g. a K8s
          // sub-type table).
          result.push({ kind: 'category-header', category: descriptor.id, total: rows.length });
          result.push({ kind: 'panel', category: descriptor.id, nested: true, rows });
        }
      }
    }
    return result;
  }, [
    effectiveEntities,
    resourceType,
    clusterFilter,
    clusterNames,
    getCategoryTypeFilter,
    groupCloudByProvider,
    useCustomGrouping,
    customGroupBy,
    enableColumnSettings,
  ]);

  if (effectiveEntities.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="search"
        title={
          <h2>
            {i18n.translate('xpack.streams.entityCentricLab.entities.list.empty.title', {
              defaultMessage: 'No {things} match your filters',
              values: { things: labThings(enableColumnSettings) },
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.streams.entityCentricLab.entities.list.empty.body', {
                defaultMessage: 'Try removing one or more filters to see {things}.',
                values: { things: labThings(enableColumnSettings) },
              })}
            </p>
          </EuiText>
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {items.map((item, index) => {
        const groupGap = index > 0 ? { marginTop: 16 } : undefined;

        if (item.kind === 'kubernetes-header') {
          if (hideCategoryHeader) return null;
          return (
            <EuiFlexItem key={`kubernetes-header-${index}`} grow={false} style={groupGap}>
              <KubernetesSectionHeader
                total={item.total}
                resourceType={resourceType}
                onResourceTypeChange={setResourceType}
                clusterNames={clusterNames}
                clusterFilter={clusterFilter}
                onClusterFilterChange={setClusterFilter}
              />
            </EuiFlexItem>
          );
        }
        if (item.kind === 'category-header') {
          if (hideCategoryHeader) return null;
          return (
            <EuiFlexItem key={`${item.category}-header-${index}`} grow={false} style={groupGap}>
              <CategorySectionHeader
                category={item.category}
                total={item.total}
                typeLabels={item.typeLabels}
                typeFilter={item.typeLabels ? getCategoryTypeFilter(item.category) : undefined}
                onTypeFilterChange={item.typeLabels ? (v) => setCategoryTypeFilter(item.category, v) : undefined}
              />
            </EuiFlexItem>
          );
        }
        if (item.kind === 'cloud-provider-header') {
          return (
            <EuiFlexItem key={`cloud-${item.provider.id}-header-${index}`} grow={false} style={groupGap}>
              <CloudProviderSectionHeader provider={item.provider} total={item.total} />
            </EuiFlexItem>
          );
        }
        if (item.kind === 'type-group-divider') {
          return (
            <EuiFlexItem key={`type-group-${item.label}-${index}`} grow={false} style={{ marginTop: 12 }}>
              <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <strong>{item.label}</strong>
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiHorizontalRule margin="none" />
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
          );
        }
        if (item.kind === 'group-header') {
          return (
            <EuiFlexItem key={`group-header-${item.label}-${index}`} grow={false} style={groupGap}>
              <GroupSectionHeader label={item.label} total={item.total} />
            </EuiFlexItem>
          );
        }
        if (item.kind === 'sub-group-header') {
          return (
            <EuiFlexItem key={`sub-group-header-${item.label}-${index}`} grow={false} style={{ marginTop: 12, marginLeft: 16 }}>
              <SubGroupSectionHeader label={item.label} total={item.total} />
            </EuiFlexItem>
          );
        }
        return (
          <EuiFlexItem
            key={`${item.category}-${item.subTypeLabel ?? ''}-${index}`}
            grow={false}
            style={{
              ...(index > 0 ? { marginTop: 8 } : {}),
              ...((item.depth ?? 0) > 0 ? { marginLeft: (item.depth ?? 0) * 16 } : {}),
            }}
          >
            {enableColumnSettings && !item.forceBasicTable ? (
              <EntityDataGridSection
                category={item.category}
                subTypeLabel={item.subTypeLabel}
                nested={item.nested}
                rows={item.rows}
                onSelectEntity={onSelectEntity}
                refreshTick={refreshTick}
              />
            ) : (
              <TableSection
                category={item.category}
                subTypeLabel={item.subTypeLabel}
                nested={item.nested}
                rows={item.rows}
                columns={columns}
                tableKey={item.subTypeLabel ? `${item.category}:${item.subTypeLabel}` : item.category}
              />
            )}
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
