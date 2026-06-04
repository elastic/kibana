/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiBadge,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
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
import { ENTITY_CATEGORIES, getCategoryDescriptor } from './fake_entities';
import {
  KUBERNETES_CLUSTER_FILTER_ALL,
  KUBERNETES_SUB_TYPE_ORDER,
  KubernetesClusterFilter,
  filterEntitiesByCluster,
  getKubernetesClusterNames,
} from './kubernetes_cluster_filter';

interface Props {
  readonly entities: readonly Entity[];
  readonly onSelectEntity: (entityName: string) => void;
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
        sortable: true,
        render: (health: EntityHealth) => (
          <EuiBadge color={HEALTH_BADGE_COLOR[health]}>{HEALTH_LABEL[health]}</EuiBadge>
        ),
      },
      {
        field: 'type',
        name: i18n.translate('xpack.streams.entityCentricLab.entities.list.columns.type', {
          defaultMessage: 'Type',
        }),
        width: '160px',
        sortable: true,
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
}: {
  category: EntityCategoryId;
  total: number;
}) => {
  const descriptor = getCategoryDescriptor(category);
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {descriptor?.icon ? (
        <EuiFlexItem grow={false}>
          <EuiIcon type={descriptor.icon} size="m" aria-hidden />
        </EuiFlexItem>
      ) : null}
      <EuiFlexItem grow={false}>
        <EuiTitle size="xxs">
          <h4>{descriptor?.label ?? category}</h4>
        </EuiTitle>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

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
}: {
  category: EntityCategoryId;
  subTypeLabel?: string;
  nested?: boolean;
  rows: readonly Entity[];
  columns: Array<EuiBasicTableColumn<Entity>>;
}) => {
  const descriptor = getCategoryDescriptor(category);
  const captionLabel = subTypeLabel
    ? `${descriptor?.label ?? category} · ${subTypeLabel}`
    : descriptor?.label ?? category;
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <SectionHeader
        category={category}
        subTypeLabel={subTypeLabel}
        total={rows.length}
        nested={nested}
      />
      <EuiSpacer size="s" />
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
          initialPageSize: PAGE_SIZE_OPTIONS[0],
          pageSizeOptions: [...PAGE_SIZE_OPTIONS],
        }}
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
      rows: Entity[];
    }
  | { kind: 'kubernetes-header'; total: number }
  | { kind: 'category-header'; category: EntityCategoryId; total: number };

const KubernetesSectionHeader = ({
  total,
  clusterNames,
  clusterFilter,
  onClusterFilterChange,
}: {
  total: number;
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
            <EuiTitle size="xxs">
              <h4>{descriptor?.label ?? 'Kubernetes'}</h4>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiBadge color="hollow">{total.toLocaleString()}</EuiBadge>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
      <EuiFlexItem />
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

export const EntitiesListView = ({ entities, onSelectEntity }: Props) => {
  const columns = useColumns(onSelectEntity);

  // Subscribe to chaos-mode flips so PayFlow storyline rows can swap
  // their health between the seeded "unhealthy" and the rollback
  // "healthy" state without requiring a page reload. The helper is a
  // no-op for any non-storyline entity, so non-PayFlow rows keep
  // their dataset-defined health.
  const chaosOn = useChaosModeEnabled();
  const effectiveEntities = useMemo<Entity[]>(
    () =>
      entities.map((entity) => {
        const effective = getEffectiveEntityHealth(entity.name, entity.health, chaosOn);
        return effective === entity.health ? entity : { ...entity, health: effective };
      }),
    [entities, chaosOn]
  );

  // Transient (not persisted) — matches the Grouped grid filter's
  // semantics so the two views feel identical when toggled.
  const [clusterFilter, setClusterFilter] = useState<string>(KUBERNETES_CLUSTER_FILTER_ALL);

  const clusterNames = useMemo(
    () =>
      getKubernetesClusterNames(
        effectiveEntities.filter((entity) => entity.category === 'kubernetes')
      ),
    [effectiveEntities]
  );

  const items = useMemo<ListItem[]>(() => {
    const buckets = new Map<EntityCategoryId, Entity[]>();
    for (const entity of effectiveEntities) {
      const list = buckets.get(entity.category) ?? [];
      list.push(entity);
      buckets.set(entity.category, list);
    }

    const result: ListItem[] = [];
    for (const descriptor of ENTITY_CATEGORIES) {
      const rows = buckets.get(descriptor.id);
      if (!rows || rows.length === 0) continue;
      if (descriptor.id === 'kubernetes') {
        // Always emit the K8s header — even when the cluster filter
        // ends up hiding every sub-type panel — so the user can see
        // the dropdown that's filtering them out and reset it. K8s
        // groups by `entity.subType` (Clusters / Nodes / Namespaces
        // / ...) using the curated reading order, instead of the
        // generic `.type`-based grouping used by other categories.
        const filtered = filterEntitiesByCluster(rows, clusterFilter, clusterNames);
        result.push({ kind: 'kubernetes-header', total: filtered.length });
        const subTypeBuckets = new Map<string, Entity[]>();
        for (const entity of filtered) {
          const key = entity.subType ?? 'Other';
          const list = subTypeBuckets.get(key) ?? [];
          list.push(entity);
          subTypeBuckets.set(key, list);
        }
        for (const subTypeLabel of KUBERNETES_SUB_TYPE_ORDER) {
          const subRows = subTypeBuckets.get(subTypeLabel);
          if (subRows && subRows.length > 0) {
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
      // Non-K8s: group by `.type` so categories with more than one
      // entity type (Hosts → Bare-metal + VM, Cloud → region + EC2 +
      // Lambda + S3, Middlewares → Kafka + RabbitMQ, LLMs → OpenAI +
      // Anthropic) render with a top-level category header and one
      // panel per type — mirroring the Kubernetes layout without its
      // cluster filter.
      const typeGroups = groupEntitiesByType(rows);
      if (typeGroups.length > 1) {
        result.push({ kind: 'category-header', category: descriptor.id, total: rows.length });
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
        result.push({ kind: 'panel', category: descriptor.id, rows });
      }
    }
    return result;
  }, [effectiveEntities, clusterFilter, clusterNames]);

  if (effectiveEntities.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="search"
        title={
          <h2>
            {i18n.translate('xpack.streams.entityCentricLab.entities.list.empty.title', {
              defaultMessage: 'No entities match your filters',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.streams.entityCentricLab.entities.list.empty.body', {
                defaultMessage: 'Try removing one or more filters to see entities.',
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
        if (item.kind === 'kubernetes-header') {
          return (
            <EuiFlexItem key={`kubernetes-header-${index}`} grow={false}>
              <KubernetesSectionHeader
                total={item.total}
                clusterNames={clusterNames}
                clusterFilter={clusterFilter}
                onClusterFilterChange={setClusterFilter}
              />
            </EuiFlexItem>
          );
        }
        if (item.kind === 'category-header') {
          return (
            <EuiFlexItem key={`${item.category}-header-${index}`} grow={false}>
              <CategorySectionHeader category={item.category} total={item.total} />
            </EuiFlexItem>
          );
        }
        return (
          <EuiFlexItem key={`${item.category}-${item.subTypeLabel ?? ''}`} grow={false}>
            <TableSection
              category={item.category}
              subTypeLabel={item.subTypeLabel}
              nested={item.nested}
              rows={item.rows}
              columns={columns}
            />
          </EuiFlexItem>
        );
      })}
    </EuiFlexGroup>
  );
};
