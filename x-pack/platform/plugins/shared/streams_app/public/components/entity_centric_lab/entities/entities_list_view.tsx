/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
  EuiBasicTable,
  EuiEmptyPrompt,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
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
  readonly onSelectEntity: (entity: Entity) => void;
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

const CategorySection = ({
  category,
  rows,
  onSelectEntity,
}: {
  category: EntityCategoryId;
  rows: readonly Entity[];
  onSelectEntity: (entity: Entity) => void;
}) => {
  const descriptor = getCategoryDescriptor(category);

  const columns = useMemo<Array<EuiBasicTableColumn<Entity>>>(
    () => [
      {
        field: 'name',
        name: i18n.translate('xpack.streams.entityCentricLab.entities.list.columns.name', {
          defaultMessage: 'Entity name',
        }),
        render: (name: string, row: Entity) => (
          <EuiLink
            data-test-subj={`entityCentricLabEntityRow-${row.id}`}
            onClick={() => onSelectEntity(row)}
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
        width: '140px',
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
      },
      {
        field: 'lastHealthChange',
        name: i18n.translate(
          'xpack.streams.entityCentricLab.entities.list.columns.lastHealthChange',
          { defaultMessage: 'Last health change' }
        ),
        width: '180px',
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

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
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
          <EuiBadge color="hollow">{rows.length.toLocaleString()}</EuiBadge>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiBasicTable<Entity>
        tableCaption={i18n.translate('xpack.streams.entityCentricLab.entities.list.tableCaption', {
          defaultMessage: '{category} entities',
          values: { category: descriptor?.label ?? category },
        })}
        items={[...rows]}
        columns={columns}
        rowHeader="name"
        data-test-subj={`entityCentricLabEntitiesTable-${category}`}
      />
    </EuiPanel>
  );
};

export const EntitiesListView = ({ entities, onSelectEntity }: Props) => {
  const grouped = useMemo(() => {
    const buckets = new Map<EntityCategoryId, Entity[]>();
    for (const entity of entities) {
      const list = buckets.get(entity.category) ?? [];
      list.push(entity);
      buckets.set(entity.category, list);
    }
    return ENTITY_CATEGORIES.map((descriptor) => ({
      category: descriptor.id,
      rows: buckets.get(descriptor.id) ?? [],
    })).filter((section) => section.rows.length > 0);
  }, [entities]);

  if (grouped.length === 0) {
    return (
      <EuiEmptyPrompt
        iconType="search"
        title={
          <h2>
            {i18n.translate('xpack.streams.entityCentricLab.entities.list.empty.title', {
              defaultMessage: 'No entities match your filter',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.streams.entityCentricLab.entities.list.empty.body', {
                defaultMessage: 'Try clearing the filter to see all entities.',
              })}
            </p>
          </EuiText>
        }
      />
    );
  }

  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {grouped.map((section) => (
        <EuiFlexItem key={section.category} grow={false}>
          <CategorySection
            category={section.category}
            rows={section.rows}
            onSelectEntity={onSelectEntity}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
