/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart, Heatmap, Settings, ScaleType } from '@elastic/charts';

import type { HeatmapState, EsqlData } from '../types';
import { toRowObjects, colName } from './data_utils';
import { baseTheme, transparentBackground } from './chart_theme';

interface HeatmapRendererProps {
  spec: HeatmapState;
  data: EsqlData;
}

export const HeatmapRenderer: React.FC<HeatmapRendererProps> = ({ spec, data }) => {
  const rows = toRowObjects(data);
  const xCol = colName(spec.x);
  const yCol = spec.y ? colName(spec.y) : undefined;
  const metricCol = colName(spec.metric);

  return (
    <Chart>
      <Settings
        showLegend={spec.legend?.visible !== false}
        theme={transparentBackground}
        baseTheme={baseTheme}
      />
      <Heatmap
        id="heatmap"
        colorScale={{
          type: 'bands',
          bands: (() => {
            const values = rows.map((r) => Number(r[metricCol]) || 0);
            const minVal = Math.min(...values);
            const maxVal = Math.max(...values);
            const step = (maxVal - minVal) / 4 || 1;
            return [
              { start: minVal, end: minVal + step, color: '#d6e4ff' },
              { start: minVal + step, end: minVal + 2 * step, color: '#84aff1' },
              { start: minVal + 2 * step, end: minVal + 3 * step, color: '#3f7de8' },
              { start: minVal + 3 * step, end: maxVal + 1, color: '#1a3e72' },
            ];
          })(),
        }}
        data={rows}
        xAccessor={(d: Record<string, unknown>) => String(d[xCol] ?? '')}
        yAccessor={yCol ? (d: Record<string, unknown>) => String(d[yCol] ?? '') : undefined}
        valueAccessor={(d: Record<string, unknown>) => Number(d[metricCol]) || 0}
        valueFormatter={(v: number) => v.toLocaleString()}
        xScale={{ type: ScaleType.Ordinal }}
        xSortPredicate="dataIndex"
        ySortPredicate="dataIndex"
      />
    </Chart>
  );
};
