/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { Chart, Settings, Partition, PartitionLayout } from '@elastic/charts';

import type { TreemapState, WaffleState, MosaicState, EsqlData, EsqlColumn } from '../types';
import { toRowObjects, colName } from './data_utils';
import { baseTheme, transparentBackground, partitionFillColor } from './chart_theme';

interface PartitionRendererProps {
  spec: TreemapState | WaffleState | MosaicState;
  data: EsqlData;
}

const layoutForType = (type: string): PartitionLayout => {
  if (type === 'treemap') return PartitionLayout.treemap;
  if (type === 'waffle') return PartitionLayout.waffle;
  if (type === 'mosaic') return PartitionLayout.mosaic;
  return PartitionLayout.treemap;
};

const getMetricCol = (spec: TreemapState | WaffleState | MosaicState): string => {
  if ('metrics' in spec && spec.metrics[0]) {
    return colName(spec.metrics[0]);
  }
  if ('metric' in spec) {
    return colName(spec.metric as EsqlColumn);
  }
  return '';
};

const getGroupCols = (spec: TreemapState | WaffleState | MosaicState): string[] => {
  const cols: string[] = [];
  if (spec.group_by) {
    for (const g of spec.group_by) {
      cols.push(colName(g));
    }
  }
  if ('group_breakdown_by' in spec && spec.group_breakdown_by) {
    for (const g of spec.group_breakdown_by) {
      cols.push(colName(g));
    }
  }
  return cols;
};

export const PartitionRenderer: React.FC<PartitionRendererProps> = ({ spec, data }) => {
  const rows = toRowObjects(data);
  const metricCol = getMetricCol(spec);
  const groupCols = getGroupCols(spec);
  const layout = layoutForType(spec.type);

  const layers = groupCols.map((groupCol) => ({
    groupByRollup: (d: Record<string, unknown>) => d[groupCol] ?? 'Other',
    nodeLabel: (key: unknown) => String(key),
    shape: {
      fillColor: partitionFillColor,
    },
  }));

  // Fallback: if no group columns, use a single layer with the metric as label
  if (layers.length === 0) {
    layers.push({
      groupByRollup: (_d: Record<string, unknown>) => 'All',
      nodeLabel: (key: unknown) => String(key),
      shape: {
        fillColor: partitionFillColor,
      },
    });
  }

  return (
    <Chart>
      <Settings
        showLegend
        legendPosition="right"
        theme={transparentBackground}
        baseTheme={baseTheme}
      />
      <Partition
        id="partition"
        data={rows}
        layout={layout}
        valueAccessor={(d: Record<string, unknown>) => Math.abs(Number(d[metricCol]) || 0)}
        valueFormatter={(v: number) => v.toLocaleString()}
        layers={layers}
      />
    </Chart>
  );
};
