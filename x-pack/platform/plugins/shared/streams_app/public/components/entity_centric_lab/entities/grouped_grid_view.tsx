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

const HealthTile = ({ health, index }: { health: EntityHealth; index: number }) => {
  const colors = useHealthColors();
  const tileClass = css`
    width: 22px;
    height: 22px;
    border-radius: 4px;
    background-color: ${colors[health]};
    flex: 0 0 22px;
  `;
  return (
    <EuiToolTip
      content={i18n.translate('xpack.streams.entityCentricLab.entities.healthTileTooltip', {
        defaultMessage: 'Entity #{index} — {status}',
        values: { index: index + 1, status: HEALTH_LABEL[health] },
      })}
    >
      <div className={tileClass} aria-label={HEALTH_LABEL[health]} role="img" tabIndex={0} />
    </EuiToolTip>
  );
};

const HealthTileRow = ({
  count,
  seed,
  maxTiles = 96,
}: {
  count: number;
  seed: number;
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
        <HealthTile key={`${seed}-${index}`} health={health} index={index} />
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

const KubernetesCard = ({ counts }: { counts: EntityCategoryCounts }) => {
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
              <HealthTileRow count={sub.total} seed={index + 7} />
            </EuiFlexItem>
          </EuiFlexGroup>
          {index === 0 ? <EuiSpacer size="s" /> : null}
        </div>
      ))}
    </EuiPanel>
  );
};

const CategoryCard = ({ counts }: { counts: EntityCategoryCounts }) => {
  if (counts.category === 'kubernetes') {
    return <KubernetesCard counts={counts} />;
  }
  return (
    <EuiPanel hasBorder hasShadow={false} paddingSize="m">
      <CategoryHeader category={counts.category} total={counts.total} />
      <EuiSpacer size="s" />
      <HealthTileRow
        count={counts.total}
        seed={ENTITY_CATEGORIES.findIndex((c) => c.id === counts.category)}
      />
    </EuiPanel>
  );
};

export const GroupedGridView = ({ dataset }: Props) => {
  return (
    <EuiFlexGroup direction="column" gutterSize="m">
      {dataset.categoryCounts.map((counts) => (
        <EuiFlexItem key={counts.category} grow={false}>
          <CategoryCard counts={counts} />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
};
