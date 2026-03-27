/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart, Metric, Settings } from '@elastic/charts';

import type { MetricState, MetricPrimary, EsqlData } from '../types';
import { toRowObjects, colName, colLabel } from './data_utils';
import { baseTheme, transparentBackground } from './chart_theme';

interface MetricRendererProps {
  spec: MetricState;
  data: EsqlData;
}

export const MetricRenderer: React.FC<MetricRendererProps> = ({ spec, data }) => {
  const rows = toRowObjects(data);
  const primary = spec.metrics.find((m) => m.type === 'primary') as MetricPrimary | undefined;
  const secondary = spec.metrics.find((m) => m.type === 'secondary');

  if (!primary) {
    return <div>No primary metric defined</div>;
  }

  const breakdownCol = spec.breakdown_by ? colName(spec.breakdown_by) : undefined;
  const maxCols = spec.breakdown_by?.columns ?? 3;

  const buildMetricDatum = (row: Record<string, unknown>) => {
    const value = row[colName(primary)] as number | null;
    const datum: Record<string, unknown> = {
      value: value ?? NaN,
      title: spec.title ?? colLabel(primary),
      subtitle: primary.sub_label,
      valueFormatter: (v: number) => {
        if (primary.format === 'percent') return `${(v * 100).toFixed(primary.decimals ?? 0)}%`;
        if (primary.decimals !== undefined) return v.toFixed(primary.decimals);
        return String(v);
      },
    };

    if (secondary) {
      const secValue = row[colName(secondary)] as number | null;
      datum.extra = (
        <span>
          {secondary.label ?? colName(secondary)}: {secValue ?? '–'}
        </span>
      );
    }

    return datum;
  };

  // If there's a breakdown, produce one metric tile per group
  if (breakdownCol) {
    const groups = new Map<string, Record<string, unknown>>();
    for (const row of rows) {
      const key = String(row[breakdownCol] ?? '');
      if (!groups.has(key)) groups.set(key, row);
    }

    const tiles = Array.from(groups.entries()).map(([key, row]) => {
      const d = buildMetricDatum(row);
      return [{ ...d, title: key }];
    });

    // Organize into rows of `maxCols`
    const metricData: Array<Array<Record<string, unknown>>> = [];
    for (let i = 0; i < tiles.length; i += maxCols) {
      metricData.push(...tiles.slice(i, i + maxCols).map((t) => t));
    }

    return (
      <Chart>
        <Settings theme={transparentBackground} baseTheme={baseTheme} />
        <Metric id="metric" data={metricData as any} />
      </Chart>
    );
  }

  // Single metric
  const row = rows[0] ?? {};
  const datum = buildMetricDatum(row);

  return (
    <Chart>
      <Settings theme={transparentBackground} baseTheme={baseTheme} />
      <Metric id="metric" data={[[datum]] as any} />
    </Chart>
  );
};
