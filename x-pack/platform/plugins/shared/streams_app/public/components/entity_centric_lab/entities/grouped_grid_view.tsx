/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiBadge,
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
import type {
  EntityCategoryCounts,
  EntityCategoryId,
  EntityHealth,
  FakeEntitiesDataset,
} from './fake_entities';
import { ENTITY_CATEGORIES, generateHealthTiles, getCategoryDescriptor } from './fake_entities';

interface Props {
  readonly dataset: FakeEntitiesDataset;
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

/**
 * Build a synthetic entity name for a heatmap tile. Each category's tiles are
 * laid out 1..N, and Kubernetes sub-types prefix their label so the resulting
 * entity name doesn't collide with siblings (e.g. `kubernetes-pods-3`).
 */
const synthesizeEntityName = ({
  categoryId,
  index,
  subLabel,
}: {
  categoryId: EntityCategoryId;
  index: number;
  subLabel?: string;
}): string => {
  const subSlug = subLabel
    ? `-${subLabel
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '')}`
    : '';
  return `${categoryId}${subSlug}-${index + 1}`;
};

const HealthTile = ({
  health,
  index,
  entityName,
  onSelectEntity,
}: {
  health: EntityHealth;
  index: number;
  entityName: string;
  onSelectEntity: (entityName: string) => void;
}) => {
  const colors = useHealthColors();
  const tileClass = css`
    width: 22px;
    height: 22px;
    border-radius: 4px;
    background-color: ${colors[health]};
    flex: 0 0 22px;
    padding: 0;
    border: none;
    cursor: pointer;
  `;
  const tooltipContent = i18n.translate(
    'xpack.streams.entityCentricLab.entities.healthTileTooltip',
    {
      defaultMessage: '{entityName} — {status}',
      values: { entityName, status: HEALTH_LABEL[health] },
    }
  );
  return (
    <EuiToolTip content={tooltipContent}>
      <button
        type="button"
        className={tileClass}
        aria-label={tooltipContent}
        data-test-subj={`entityCentricLabHealthTile-${entityName}`}
        onClick={() => onSelectEntity(entityName)}
      />
    </EuiToolTip>
  );
};

const HealthTileRow = ({
  count,
  seed,
  categoryId,
  subLabel,
  onSelectEntity,
  maxTiles = 96,
}: {
  count: number;
  seed: number;
  categoryId: EntityCategoryId;
  subLabel?: string;
  onSelectEntity: (entityName: string) => void;
  maxTiles?: number;
}) => {
  const tileCount = Math.min(count, maxTiles);
  const tiles = useMemo(
    () => generateHealthTiles({ key: `seed-${seed}`, count: tileCount, bias: seed }),
    [seed, tileCount]
  );
  const containerClass = css`
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
  `;
  return (
    <div className={containerClass} role="list">
      {tiles.map((health, index) => (
        <HealthTile
          key={`${seed}-${index}`}
          health={health}
          index={index}
          entityName={synthesizeEntityName({ categoryId, index, subLabel })}
          onSelectEntity={onSelectEntity}
        />
      ))}
      {count > maxTiles ? (
        <EuiText size="xs" color="subdued">
          {i18n.translate('xpack.streams.entityCentricLab.entities.tileOverflow', {
            defaultMessage: '+{count} more',
            values: { count: (count - maxTiles).toLocaleString() },
          })}
        </EuiText>
      ) : null}
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
  counts,
  onSelectEntity,
}: {
  counts: EntityCategoryCounts;
  onSelectEntity: (entityName: string) => void;
}) => {
  const { euiTheme } = useEuiTheme();
  const subCounts = counts.subCounts ?? [];
  const subRowClass = css`
    padding: ${euiTheme.size.s} 0;
    border-top: ${euiTheme.border.thin};
  `;
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <CategoryHeader category="kubernetes" total={counts.total} />
      <EuiSpacer size="m" />
      {subCounts.map((sub, index) => (
        <div key={sub.label} className={index === 0 ? undefined : subRowClass}>
          <EuiFlexGroup alignItems="flexStart" gutterSize="m" responsive={false}>
            <EuiFlexItem grow={false} style={{ minWidth: 140 }}>
              <EuiText size="s">
                <strong>{sub.label}</strong>
              </EuiText>
              <EuiText size="xs" color="subdued">
                {sub.total.toLocaleString()}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <HealthTileRow
                count={sub.total}
                seed={index + 7}
                categoryId="kubernetes"
                subLabel={sub.label}
                onSelectEntity={onSelectEntity}
              />
            </EuiFlexItem>
          </EuiFlexGroup>
          {index === 0 ? <EuiSpacer size="s" /> : null}
        </div>
      ))}
    </EuiPanel>
  );
};

const CategoryCard = ({
  counts,
  onSelectEntity,
}: {
  counts: EntityCategoryCounts;
  onSelectEntity: (entityName: string) => void;
}) => {
  if (counts.category === 'kubernetes') {
    return <KubernetesCard counts={counts} onSelectEntity={onSelectEntity} />;
  }
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <CategoryHeader category={counts.category} total={counts.total} />
      <EuiSpacer size="s" />
      <HealthTileRow
        count={counts.total}
        seed={ENTITY_CATEGORIES.findIndex((c) => c.id === counts.category)}
        categoryId={counts.category}
        onSelectEntity={onSelectEntity}
      />
    </EuiPanel>
  );
};

export const GroupedGridView = ({ dataset, onSelectEntity }: Props) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {dataset.categoryCounts.map((counts) => (
        <EuiFlexItem key={counts.category} grow={false}>
          <CategoryCard counts={counts} onSelectEntity={onSelectEntity} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
