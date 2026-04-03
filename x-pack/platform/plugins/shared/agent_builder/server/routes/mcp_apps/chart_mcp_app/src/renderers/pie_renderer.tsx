/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart, Settings, Partition, PartitionLayout } from '@elastic/charts';

import type { PieState, EsqlData } from '../types';
import { toRowObjects, colName } from './data_utils';
import { baseTheme, transparentBackground, partitionFillColor } from './chart_theme';

interface PieRendererProps {
  spec: PieState;
  data: EsqlData;
}

export const PieRenderer: React.FC<PieRendererProps> = ({ spec, data }) => {
  const rows = toRowObjects(data);
  const metric = spec.metrics[0];
  if (!metric) return <div>No metric defined</div>;

  const metricCol = colName(metric);
  const groupCols = (spec.group_by ?? []).map((g) => colName(g));

  const isDonut = spec.type === 'donut' || (spec.donut_hole && spec.donut_hole !== 'none');

  const emptySize =
    spec.donut_hole === 'large'
      ? 0.6
      : spec.donut_hole === 'medium'
      ? 0.45
      : spec.donut_hole === 'small'
      ? 0.3
      : isDonut
      ? 0.45
      : 0;

  const layers = groupCols.map((groupCol) => ({
    groupByRollup: (d: Record<string, unknown>) => d[groupCol] ?? 'Other',
    nodeLabel: (key: unknown) => String(key),
    shape: {
      fillColor: partitionFillColor,
    },
  }));

  return (
    <Chart>
      <Settings
        showLegend={spec.legend?.visible !== false}
        legendPosition="right"
        theme={transparentBackground}
        baseTheme={baseTheme}
      />
      <Partition
        id="pie"
        data={rows}
        layout={PartitionLayout.sunburst}
        valueAccessor={(d: Record<string, unknown>) => Math.abs(Number(d[metricCol]) || 0)}
        valueFormatter={(v: number) => v.toLocaleString()}
        layers={layers}
        emptySizeRatio={emptySize}
      />
    </Chart>
  );
};
