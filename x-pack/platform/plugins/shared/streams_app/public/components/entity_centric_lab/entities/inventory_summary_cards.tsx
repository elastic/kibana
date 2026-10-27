/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import type { ChartsPluginStart } from '@kbn/charts-plugin/public';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIconTip,
  useEuiTheme,
} from '@elastic/eui';
import type { MetricDatum } from '@elastic/charts';
import { Chart, Metric, MetricTrendShape, Settings } from '@elastic/charts';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import type { ListDensity } from './list_density';
import type { Entity } from './fake_entities';
import {
  ALERTS_FILTER_ALL,
  getEntityAlertsBucket,
  type AlertsFilterId,
} from './entity_alerts_filter';

const HASH_MODULUS = 2147483647;

const hashSeed = (input: string): number => {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) % HASH_MODULUS;
  }
  return hash;
};

const seededRandom = (seed: number) => {
  let state = seed || 1;
  return () => {
    state = (state * 1103515245 + 12345) % HASH_MODULUS;
    return state / HASH_MODULUS;
  };
};

const buildTrend = (scopeKey: string, tileKey: string, count: number): Array<{ x: number; y: number }> => {
  const points = 24;
  const rand = seededRandom(hashSeed(`${scopeKey}:${tileKey}`));
  const values: number[] = [];
  if (count === 0) {
    return Array.from({ length: points }, (_, x) => ({ x, y: 0 }));
  }
  const start = Math.max(0, count * (0.3 + rand() * 0.4));
  let current = start;
  for (let i = 0; i < points - 1; i++) {
    const delta = (rand() - 0.4) * (count * 0.25 + 1);
    current = Math.max(0, current + delta);
    values.push(current);
  }
  values.push(count);
  return values.map((y, x) => ({ x, y }));
};

/** Active-alerts tile tint (flyout golden-signal danger). */
const TILE_DANGER = '#FFB5AD';

const buildNeutralMetricDatum = ({
  label,
  count,
  trend,
  infoTooltip,
  emptyShade,
  textColor,
}: {
  label: string;
  count: number;
  trend: Array<{ x: number; y: number }>;
  infoTooltip: string;
  emptyShade: string;
  textColor: string;
}): MetricDatum => ({
  title: label,
  value: count.toLocaleString(),
  background: emptyShade,
  // Sparkline base rect uses `color`; white keeps the tile clean — path stroke is light grey.
  color: emptyShade,
  valueColor: textColor,
  trend,
  trendShape: MetricTrendShape.Area,
  trendA11yTitle: label,
  trendA11yDescription: infoTooltip,
});

const tileLayout = (density: ListDensity | undefined) => {
  switch (density) {
    case 'expanded':
      return { height: 88, minWidth: 160, titlePx: 15, valuePx: 24, extraPx: 12, padPx: 6 };
    case 'normal':
      return { height: 80, minWidth: 148, titlePx: 14, valuePx: 22, extraPx: 11, padPx: 5 };
    case 'compact':
    default:
      return { height: 72, minWidth: 132, titlePx: 14, valuePx: 20, extraPx: 11, padPx: 4 };
  }
};

const titleRowHeight = (layout: ReturnType<typeof tileLayout>) => layout.titlePx + layout.padPx + 2;

const metricTileStyles = (
  layout: ReturnType<typeof tileLayout>,
  euiTheme: ReturnType<typeof useEuiTheme>['euiTheme'],
  isFilterActive: boolean,
  neutralTile: boolean
) => css`
  position: relative;
  height: ${layout.height}px;
  border: ${isFilterActive
    ? `2px solid ${euiTheme.colors.primary}`
    : euiTheme.border.thin};
  border-radius: ${euiTheme.border.radius.small};
  overflow: hidden;
  width: 100%;

  ${neutralTile
    ? css`
        .echMetric {
          background-color: ${euiTheme.colors.emptyShade} !important;
        }
        .echMetricText__title {
          color: ${euiTheme.colors.text} !important;
        }
        .echMetricText__value,
        .echMetricText__valueBlock {
          color: ${euiTheme.colors.text} !important;
        }
        .echSingleMetricSparkline rect {
          fill: ${euiTheme.colors.emptyShade} !important;
        }
        .echSingleMetricSparkline path {
          fill: ${euiTheme.colors.lightShade} !important;
        }
      `
    : ''}

  .echMetricText {
    padding: ${layout.padPx}px ${layout.padPx + 2}px !important;
    padding-top: ${titleRowHeight(layout)}px !important;
  }
  .echMetricText__title {
    display: none !important;
  }
  .echMetricText__value {
    font-size: ${layout.valuePx}px !important;
    font-weight: ${euiTheme.font.weight.bold} !important;
    line-height: 1.15 !important;
    color: ${euiTheme.colors.text} !important;
  }
  .echMetricText__valueBlock {
    margin-top: 0 !important;
  }
  .echMetricText__part {
    font-size: inherit !important;
    font-weight: inherit;
  }
  .echMetricText__extra,
  .echMetricText__extraBlock .echMetricText__extra {
    font-weight: ${euiTheme.font.weight.medium} !important;
  }
  .echMetricText__extraBlock {
    font-size: ${layout.extraPx}px !important;
    line-height: 1.2 !important;
  }
`;

const SummaryMetricCard = ({
  testSubj,
  metricId,
  label,
  count,
  tileColor,
  neutralTile,
  trend,
  infoTooltip,
  filterHint,
  isFilterActive,
  onClick,
  charts,
  layout,
}: {
  testSubj: string;
  metricId: string;
  label: string;
  count: number;
  tileColor?: string;
  neutralTile?: boolean;
  trend: Array<{ x: number; y: number }>;
  infoTooltip: string;
  filterHint?: string;
  isFilterActive?: boolean;
  onClick?: () => void;
  charts: ChartsPluginStart;
  layout: ReturnType<typeof tileLayout>;
}) => {
  const { euiTheme } = useEuiTheme();
  const chartBaseTheme = charts.theme.useChartsBaseTheme();

  const a11yLabel = filterHint ? `${label}. ${filterHint}` : label;

  const infoTipContent = filterHint
    ? i18n.translate('xpack.streams.entityCentricLab.entities.summaryCards.infoWithFilter', {
        defaultMessage: '{info} {filterHint}.',
        values: { info: infoTooltip, filterHint },
      })
    : infoTooltip;

  const datum: MetricDatum = neutralTile
    ? buildNeutralMetricDatum({
        label,
        count,
        trend,
        infoTooltip: infoTipContent,
        emptyShade: euiTheme.colors.emptyShade,
        textColor: euiTheme.colors.text,
      })
    : {
        title: label,
        value: count.toLocaleString(),
        color: tileColor ?? TILE_DANGER,
        valueColor: euiTheme.colors.text,
        trend,
        trendShape: MetricTrendShape.Area,
        trendA11yTitle: label,
        trendA11yDescription: infoTipContent,
      };

  const tile = (
    <div
      role={onClick ? undefined : 'group'}
      aria-label={a11yLabel}
      css={metricTileStyles(layout, euiTheme, Boolean(isFilterActive), Boolean(neutralTile))}
      data-test-subj={testSubj}
    >
      <div
        css={css`
          position: absolute;
          top: ${layout.padPx}px;
          left: ${layout.padPx + 2}px;
          right: calc(${euiTheme.size.l} + ${euiTheme.size.xxs});
          z-index: 1;
          display: flex;
          align-items: baseline;
          gap: ${euiTheme.size.xs};
          min-width: 0;
          min-height: ${layout.titlePx}px;
          pointer-events: none;
        `}
      >
        <span
          css={css`
            font-size: ${layout.titlePx}px;
            font-weight: ${euiTheme.font.weight.semiBold};
            line-height: 1.2;
            color: ${euiTheme.colors.text};
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            min-width: 0;
            flex: 1 1 auto;
          `}
        >
          {label}
        </span>
        {filterHint ? (
          <span
            css={css`
              font-size: ${layout.extraPx}px;
              font-weight: ${euiTheme.font.weight.medium};
              line-height: 1.2;
              color: ${euiTheme.colors.textSubdued};
              white-space: nowrap;
              flex: 0 0 auto;
            `}
          >
            {filterHint}
          </span>
        ) : null}
      </div>
      <div
        css={css`
          position: absolute;
          inset: 0;
          ${onClick ? 'pointer-events: none;' : ''}
        `}
      >
        <Chart>
          <Settings baseTheme={chartBaseTheme} locale={i18n.getLocale()} />
          <Metric id={metricId} data={[[datum]]} />
        </Chart>
      </div>
      <span
        css={css`
          position: absolute;
          top: ${euiTheme.size.xs};
          right: ${euiTheme.size.xs};
          z-index: 2;
          pointer-events: auto;
        `}
        onMouseDown={(event) => event.stopPropagation()}
        onClick={(event) => event.stopPropagation()}
      >
        <EuiIconTip
          type="info"
          size="s"
          color="subdued"
          position="top"
          content={infoTipContent}
          aria-label={infoTipContent}
        />
      </span>
    </div>
  );

  if (!onClick) {
    return tile;
  }

  return (
    <button
      type="button"
      onClick={onClick}
      css={css`
        all: unset;
        cursor: pointer;
        display: block;
        width: 100%;
        border-radius: ${euiTheme.border.radius.small};
        transition: transform ${euiTheme.animation.fast} ease;
        &:hover {
          transform: translateY(-1px);
        }
        &:focus-visible {
          outline: 2px solid ${euiTheme.colors.primary};
          outline-offset: 2px;
        }
      `}
    >
      {tile}
    </button>
  );
};

export const computeInventoryAlertCounts = (
  entities: readonly Entity[]
): { readonly total: number; readonly active: number; readonly noSetup: number } => {
  let active = 0;
  let noSetup = 0;
  for (const entity of entities) {
    const bucket = getEntityAlertsBucket(entity);
    if (bucket === 'active') active += 1;
    if (bucket === 'no_setup') noSetup += 1;
  }
  return { total: entities.length, active, noSetup };
};

export interface InventorySummaryCardsProps {
  readonly entities: readonly Entity[];
  readonly thingsLabel: string;
  readonly scopeKey: string;
  readonly alertsFilter: AlertsFilterId;
  readonly onAlertsFilterChange: (next: AlertsFilterId) => void;
  readonly charts: ChartsPluginStart;
  readonly density?: ListDensity;
}

export const InventorySummaryCards = ({
  entities,
  thingsLabel,
  scopeKey,
  alertsFilter,
  onAlertsFilterChange,
  charts,
  density,
}: InventorySummaryCardsProps) => {
  const counts = useMemo(() => computeInventoryAlertCounts(entities), [entities]);
  const layout = tileLayout(density);

  const filterHint = (target: Exclude<AlertsFilterId, 'all'>) =>
    alertsFilter === target
      ? i18n.translate('xpack.streams.entityCentricLab.entities.summaryCards.clearFilterHint', {
          defaultMessage: 'Click to clear filter',
        })
      : i18n.translate('xpack.streams.entityCentricLab.entities.summaryCards.applyFilterHint', {
          defaultMessage: 'Click to filter list',
        });

  const toggleFilter = (target: Exclude<AlertsFilterId, 'all'>) => {
    onAlertsFilterChange(alertsFilter === target ? ALERTS_FILTER_ALL : target);
  };

  const resourcesLabel = i18n.translate(
    'xpack.streams.entityCentricLab.entities.summaryCards.resources',
    {
      defaultMessage: '{things}',
      values: { things: thingsLabel },
    }
  );

  return (
    <EuiFlexGroup
      gutterSize="xs"
      responsive={false}
      data-test-subj="entityCentricLabInventorySummaryCards"
    >
      <EuiFlexItem style={{ minWidth: layout.minWidth }}>
        <SummaryMetricCard
          testSubj="entityCentricLabInventorySummaryCard-total"
          metricId="entityCentricLab-inventorySummary-total"
          label={resourcesLabel}
          count={counts.total}
          neutralTile
          trend={buildTrend(scopeKey, 'total', counts.total)}
          infoTooltip={i18n.translate(
            'xpack.streams.entityCentricLab.entities.summaryCards.resourcesInfo',
            {
              defaultMessage:
                'Total inventoried {things} matching your current search and facet filters. Alert status filtering is not applied to this count.',
              values: { things: thingsLabel.toLowerCase() },
            }
          )}
          charts={charts}
          layout={layout}
        />
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: layout.minWidth }}>
        <SummaryMetricCard
          testSubj="entityCentricLabInventorySummaryCard-activeAlerts"
          metricId="entityCentricLab-inventorySummary-activeAlerts"
          label={i18n.translate(
            'xpack.streams.entityCentricLab.entities.summaryCards.activeAlerts',
            {
              defaultMessage: '{things} with active alerts',
              values: { things: thingsLabel },
            }
          )}
          count={counts.active}
          neutralTile={counts.active === 0}
          tileColor={TILE_DANGER}
          trend={buildTrend(scopeKey, 'active-alerts', counts.active)}
          infoTooltip={i18n.translate(
            'xpack.streams.entityCentricLab.entities.summaryCards.activeAlertsInfo',
            {
              defaultMessage:
                '{things} with at least one alert rule firing in the selected time range.',
              values: { things: thingsLabel },
            }
          )}
          filterHint={filterHint('active')}
          isFilterActive={alertsFilter === 'active'}
          onClick={() => toggleFilter('active')}
          charts={charts}
          layout={layout}
        />
      </EuiFlexItem>
      <EuiFlexItem style={{ minWidth: layout.minWidth }}>
        <SummaryMetricCard
          testSubj="entityCentricLabInventorySummaryCard-noSetup"
          metricId="entityCentricLab-inventorySummary-noSetup"
          label={i18n.translate(
            'xpack.streams.entityCentricLab.entities.summaryCards.noAlertSetup',
            {
              defaultMessage: '{things} with no alert set up',
              values: { things: thingsLabel },
            }
          )}
          count={counts.noSetup}
          neutralTile
          trend={buildTrend(scopeKey, 'no-alert-setup', counts.noSetup)}
          infoTooltip={i18n.translate(
            'xpack.streams.entityCentricLab.entities.summaryCards.noAlertSetupInfo',
            {
              defaultMessage: '{things} that do not have any alert rules configured yet.',
              values: { things: thingsLabel },
            }
          )}
          filterHint={filterHint('no_setup')}
          isFilterActive={alertsFilter === 'no_setup'}
          onClick={() => toggleFilter('no_setup')}
          charts={charts}
          layout={layout}
        />
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};
