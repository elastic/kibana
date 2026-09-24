/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart as EuiChart, Metric, MetricTrendShape, Settings } from '@elastic/charts';
import type { MetricDatum, MetricWNumber, MetricWTrend } from '@elastic/charts';
import { EuiCallOut, useEuiTheme } from '@elastic/eui';
import { useElasticChartsTheme } from '@kbn/charts-theme';
import type { CatalogComponent, ComponentRenderProps } from '@kbn/a2ui-renderer';

const FORMATS = ['number', 'percent', 'bytes', 'duration'] as const;
type Format = (typeof FORMATS)[number];

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];

/** Formats for a tile, where space is tight and precision rarely helps. */
function formatValue(value: number, format: Format): string {
  if (format === 'percent') return `${Math.round(value * 10) / 10}%`;
  if (format === 'duration') {
    if (value < 60) return `${Math.round(value)}s`;
    if (value < 3600) return `${Math.round(value / 60)}m`;
    return `${Math.round(value / 360) / 10}h`;
  }
  if (format === 'bytes') {
    let scaled = value;
    let unit = 0;
    while (scaled >= 1024 && unit < UNITS.length - 1) {
      scaled /= 1024;
      unit++;
    }
    return `${Math.round(scaled * 10) / 10}${UNITS[unit]}`;
  }
  return value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

const str = (value: unknown, fallback = ''): string =>
  typeof value === 'string'
    ? value
    : value === null || value === undefined
    ? fallback
    : String(value);
const num = (value: unknown): number | undefined => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Number(value);
  }
  return undefined;
};

/**
 * Elastic Charts' metric visualization — the same one Lens draws — rather than
 * EUI's `Stat`, which is only styled text. A tile carries its own colour, an
 * optional sparkline of how the value got here, and the sizing rules the rest of
 * Kibana's metrics use.
 *
 * One chart renders the whole row: `Metric` takes a grid of tiles, so four
 * numbers are one spec rather than four charts fighting over the panel.
 */
function MetricChartRenderer({ props, accessibility }: ComponentRenderProps) {
  const theme = useElasticChartsTheme();
  const { euiTheme } = useEuiTheme();

  // Elastic Charts treats a tile's `color` as its background fill. Tiles sit on
  // the panel, so the fill stays the plain panel background and the semantic
  // colour goes on the value instead.
  const palette: Record<string, string> = {
    primary: euiTheme.colors.textPrimary,
    success: euiTheme.colors.textSuccess,
    warning: euiTheme.colors.textWarning,
    danger: euiTheme.colors.textDanger,
    accent: euiTheme.colors.textAccent,
    subdued: euiTheme.colors.textSubdued,
  };

  const entries = Array.isArray(props.metrics) ? props.metrics : [];
  const tiles: MetricDatum[] = [];

  for (const entry of entries) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) continue;
    const tile = entry as Record<string, unknown>;
    const value = num(tile.value);
    if (value === undefined) continue;

    const format = (FORMATS as readonly string[]).includes(str(tile.format))
      ? (str(tile.format) as Format)
      : 'number';

    const valueColor = palette[str(tile.color, 'primary')] ?? palette.primary;
    const base: MetricWNumber = {
      color: euiTheme.colors.backgroundBasePlain,
      valueColor,
      title: str(tile.title),
      subtitle: tile.subtitle ? str(tile.subtitle) : undefined,
      value,
      valueFormatter: (raw: number) => formatValue(raw, format),
    };

    // A sparkline turns a bare number into something with shape, which is the
    // point of using a metric chart rather than styled text.
    const trendRows = Array.isArray(tile.trendRows) ? tile.trendRows : undefined;
    const trendX = str(tile.trendX);
    const trendY = str(tile.trendY);
    if (trendRows && trendX && trendY) {
      const trend = trendRows
        .map((row) => {
          if (typeof row !== 'object' || row === null) return undefined;
          const record = row as Record<string, unknown>;
          const x =
            num(record[trendX]) ??
            (typeof record[trendX] === 'string' ? Date.parse(record[trendX] as string) : undefined);
          const y = num(record[trendY]);
          return x === undefined || Number.isNaN(x) || y === undefined ? undefined : { x, y };
        })
        .filter((point): point is { x: number; y: number } => point !== undefined);

      if (trend.length > 1) {
        tiles.push({
          ...base,
          // The sparkline is `color` shifted 10% in lightness, and `color` is
          // also the tile's background fill — so there is no way to keep a plain
          // background and a saturated sparkline. Leaving both on the panel
          // background gives a subtle grey wash behind the number, which is the
          // point of the sparkline without the block of colour.
          trend,
          trendShape: MetricTrendShape.Area,
          trendA11yTitle: `${base.title} over time`,
        } as MetricWTrend);
        continue;
      }
    }

    tiles.push(base);
  }

  if (tiles.length === 0) {
    return <EuiCallOut announceOnMount size="s" color="warning" title="No metrics to show yet" />;
  }

  return (
    <EuiChart size={{ height: '100%' }} aria-label={accessibility?.label ?? 'Metrics'}>
      <Settings baseTheme={theme} />
      {/* One row of tiles; Metric takes a grid, so this is `[row]`. */}
      <Metric id="metrics" data={[tiles]} />
    </EuiChart>
  );
}

export const MetricChart: CatalogComponent = {
  name: 'MetricChart',
  render: MetricChartRenderer,
};
