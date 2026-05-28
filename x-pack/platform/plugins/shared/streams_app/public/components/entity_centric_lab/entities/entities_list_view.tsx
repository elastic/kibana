/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
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
import type { Entity, EntityCategoryId, EntityHealth } from './fake_entities';
import { ENTITY_CATEGORIES, getCategoryDescriptor } from './fake_entities';

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

const KUBERNETES_SUB_TYPE_ORDER: readonly string[] = [
  'Clusters',
  'Nodes',
  'Namespaces',
  'Pods',
  'Deployments',
  'Containers',
];

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
        render: (name: string, row: Entity) => (
          <EuiLink
            data-test-subj={`entityCentricLabEntityRow-${row.id}`}
            onClick={() => onSelectEntity(row.name)}
          >
            {name}
          </EuiLink>
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

const SectionHeader = ({
  category,
  subTypeLabel,
  total,
}: {
  category: EntityCategoryId;
  subTypeLabel?: string;
  total: number;
}) => {
  const descriptor = getCategoryDescriptor(category);
  const heading = subTypeLabel
    ? `${descriptor?.label ?? category} · ${subTypeLabel}`
    : descriptor?.label ?? category;
  return (
    <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false}>
      {descriptor?.icon ? (
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
  rows,
  columns,
}: {
  category: EntityCategoryId;
  subTypeLabel?: string;
  rows: readonly Entity[];
  columns: Array<EuiBasicTableColumn<Entity>>;
}) => {
  const descriptor = getCategoryDescriptor(category);
  const captionLabel = subTypeLabel
    ? `${descriptor?.label ?? category} · ${subTypeLabel}`
    : descriptor?.label ?? category;
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <SectionHeader category={category} subTypeLabel={subTypeLabel} total={rows.length} />
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

interface ListSection {
  readonly category: EntityCategoryId;
  readonly subTypeLabel?: string;
  readonly rows: Entity[];
}

export const EntitiesListView = ({ entities, onSelectEntity }: Props) => {
  const columns = useColumns(onSelectEntity);

  const sections = useMemo<ListSection[]>(() => {
    const buckets = new Map<EntityCategoryId, Entity[]>();
    for (const entity of entities) {
      const list = buckets.get(entity.category) ?? [];
      list.push(entity);
      buckets.set(entity.category, list);
    }

    const result: ListSection[] = [];
    for (const descriptor of ENTITY_CATEGORIES) {
      const rows = buckets.get(descriptor.id);
      if (!rows || rows.length === 0) continue;
      if (descriptor.id === 'kubernetes') {
        const subTypeBuckets = new Map<string, Entity[]>();
        for (const entity of rows) {
          const key = entity.subType ?? 'Other';
          const list = subTypeBuckets.get(key) ?? [];
          list.push(entity);
          subTypeBuckets.set(key, list);
        }
        for (const subTypeLabel of KUBERNETES_SUB_TYPE_ORDER) {
          const subRows = subTypeBuckets.get(subTypeLabel);
          if (subRows && subRows.length > 0) {
            result.push({ category: 'kubernetes', subTypeLabel, rows: subRows });
          }
        }
      } else {
        result.push({ category: descriptor.id, rows });
      }
    }
    return result;
  }, [entities]);

  if (sections.length === 0) {
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
      {sections.map((section) => (
        <EuiFlexItem key={`${section.category}-${section.subTypeLabel ?? ''}`} grow={false}>
          <TableSection
            category={section.category}
            subTypeLabel={section.subTypeLabel}
            rows={section.rows}
            columns={columns}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
