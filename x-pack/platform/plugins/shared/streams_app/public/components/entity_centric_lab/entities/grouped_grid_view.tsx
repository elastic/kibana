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
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  EuiToolTip,
  transparentize,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { css } from '@emotion/css';
import type { Entity, EntityCategoryId, EntityHealth } from './fake_entities';
import { ENTITY_CATEGORIES, getCategoryDescriptor } from './fake_entities';

interface Props {
  readonly entities: readonly Entity[];
  readonly onSelectEntity: (entityName: string) => void;
}

const useHealthColors = (): Record<EntityHealth, string> => {
  const { euiTheme } = useEuiTheme();
  return useMemo(
    () => ({
      healthy: transparentize(euiTheme.colors.severity.success, 0.45),
      atRisk: transparentize(euiTheme.colors.severity.warning, 0.55),
      unhealthy: transparentize(euiTheme.colors.severity.danger, 0.55),
    }),
    [euiTheme]
  );
};

const HEALTH_LABEL: Record<EntityHealth, string> = {
  healthy: i18n.translate('xpack.streams.entityCentricLab.entities.health.healthy', {
    defaultMessage: 'Healthy',
  }),
  atRisk: i18n.translate('xpack.streams.entityCentricLab.entities.health.atRisk', {
    defaultMessage: 'At risk',
  }),
  unhealthy: i18n.translate('xpack.streams.entityCentricLab.entities.health.unhealthy', {
    defaultMessage: 'Unhealthy',
  }),
};

const HealthTile = ({
  entity,
  onSelectEntity,
}: {
  entity: Entity;
  onSelectEntity: (entityName: string) => void;
}) => {
  const colors = useHealthColors();
  const tileClass = css`
    width: 22px;
    height: 22px;
    border-radius: 4px;
    background-color: ${colors[entity.health]};
    flex: 0 0 22px;
    padding: 0;
    border: none;
    cursor: pointer;
  `;
  const tooltipContent = i18n.translate(
    'xpack.streams.entityCentricLab.entities.healthTileTooltip',
    {
      defaultMessage: '{entityName} — {status}',
      values: { entityName: entity.name, status: HEALTH_LABEL[entity.health] },
    }
  );
  return (
    <EuiToolTip content={tooltipContent}>
      <button
        type="button"
        className={tileClass}
        aria-label={tooltipContent}
        data-test-subj={`entityCentricLabHealthTile-${entity.name}`}
        onClick={() => onSelectEntity(entity.name)}
      />
    </EuiToolTip>
  );
};

const HealthTileRow = ({
  entities,
  onSelectEntity,
}: {
  entities: readonly Entity[];
  onSelectEntity: (entityName: string) => void;
}) => {
  // No truncation — every entity in the bucket renders as its own tile so
  // the map view stays consistent with the count shown in the header (and
  // with the list-view count). The wrap+flex layout handles large pods/
  // containers buckets gracefully.
  const containerClass = css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    align-items: center;
  `;
  return (
    <div className={containerClass} role="list">
      {entities.map((entity) => (
        <HealthTile key={entity.id} entity={entity} onSelectEntity={onSelectEntity} />
      ))}
    </div>
  );
};

const CategoryHeader = ({ category, total }: { category: EntityCategoryId; total: number }) => {
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

const KubernetesCard = ({
  entities,
  onSelectEntity,
}: {
  entities: readonly Entity[];
  onSelectEntity: (entityName: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const subRowClass = css`
    padding: ${euiTheme.size.s} 0;
    border-top: ${euiTheme.border.thin};
  `;

  const groupedBySubType = useMemo(() => {
    const groups = new Map<string, Entity[]>();
    for (const entity of entities) {
      const key = entity.subType ?? 'Other';
      const list = groups.get(key) ?? [];
      list.push(entity);
      groups.set(key, list);
    }
    return groups;
  }, [entities]);

  // Preserve the canonical sub-type ordering (Clusters → Containers) when
  // some sub-types are still present after filtering; rendering nothing if
  // a sub-type has zero matches keeps the card compact.
  const orderedSubTypes = useMemo(
    () =>
      ['Clusters', 'Nodes', 'Namespaces', 'Pods', 'Deployments', 'Containers']
        .map((label) => ({ label, rows: groupedBySubType.get(label) ?? [] }))
        .filter((group) => group.rows.length > 0),
    [groupedBySubType]
  );

  if (entities.length === 0) {
    return null;
  }

  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <CategoryHeader category="kubernetes" total={entities.length} />
      <EuiSpacer size="m" />
      {orderedSubTypes.map((group, index) => (
        <div key={group.label} className={index === 0 ? undefined : subRowClass}>
          <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false} style={{ minWidth: 140 }}>
              <EuiText size="s">
                <strong>{group.label}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {group.rows.length.toLocaleString()}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <HealthTileRow entities={group.rows} onSelectEntity={onSelectEntity} />
            </EuiFlexItem>
          </EuiFlexGroup>
          {index === 0 ? <EuiSpacer size="s" /> : null}
        </div>
      ))}
    </EuiPanel>
  );
};

const CategoryCard = ({
  category,
  entities,
  onSelectEntity,
}: {
  category: EntityCategoryId;
  entities: readonly Entity[];
  onSelectEntity: (entityName: string) => void;
}) => {
  if (category === 'kubernetes') {
    return <KubernetesCard entities={entities} onSelectEntity={onSelectEntity} />;
  }
  if (entities.length === 0) {
    return null;
  }
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <CategoryHeader category={category} total={entities.length} />
      <EuiSpacer size="s" />
      <HealthTileRow entities={entities} onSelectEntity={onSelectEntity} />
    </EuiPanel>
  );
};

export const GroupedGridView = ({ entities, onSelectEntity }: Props) => {
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
        iconType="filter"
        title={
          <h2>
            {i18n.translate('xpack.streams.entityCentricLab.entities.grid.empty.title', {
              defaultMessage: 'No entities match your filters',
            })}
          </h2>
        }
        body={
          <EuiText size="s" color="subdued">
            <p>
              {i18n.translate('xpack.streams.entityCentricLab.entities.grid.empty.body', {
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
      {grouped.map((section) => (
        <EuiFlexItem key={section.category} grow={false}>
          <CategoryCard
            category={section.category}
            entities={section.rows}
            onSelectEntity={onSelectEntity}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
