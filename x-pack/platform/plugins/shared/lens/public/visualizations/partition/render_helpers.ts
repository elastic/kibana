/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegendValue } from '@elastic/charts';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { PartitionLegendValue } from '@kbn/expression-partition-vis-plugin/common';
import type { PartitionChartType as PieChartType, LensPartitionLayerState } from '@kbn/lens-common';
import { PartitionChartsMeta } from './partition_charts_meta';

// Waffle only supports the `value` legend stat: `percent` is not offered in the UI, and showing
// more than one stat breaks the legend. Stats from other charts (e.g. XY's average or max)
// carried over in the layer state are not valid here and would break the legend layout.
const isPartitionLegendValue = (stat: string): stat is PartitionLegendValue =>
  stat === LegendValue.Value;

// A partition legend shows at most one stat. Currently, `value` is the only supported stat today,
// and the cap keeps the layout intact if more are added. To increase we need to support the table layout.
export const MAX_PARTITION_LEGEND_STATS = 1;

const getSupportedLegendStats = (stats: PartitionLegendValue[] | undefined) =>
  stats?.filter(isPartitionLegendValue).slice(0, MAX_PARTITION_LEGEND_STATS);

export const getLegendStats = (layer: LensPartitionLayerState, shape: PieChartType) => {
  if ('defaultLegendStats' in PartitionChartsMeta[shape]?.legend) {
    const supportedStats = getSupportedLegendStats(layer.legendStats);
    if (supportedStats?.length || layer.legendStats?.length === 0) {
      return supportedStats;
    }
    return PartitionChartsMeta[shape].legend.defaultLegendStats ?? [LegendValue.Value];
  }
};

/**
 * Drops the legend stats a partition chart can't render when switching to `shape`: all of them
 * for shapes without legend stats, otherwise only the unsupported ones.
 */
export const stripUnsupportedLegendStats = (
  layer: LensPartitionLayerState,
  shape: PieChartType
): LensPartitionLayerState => {
  if (!layer.legendStats) {
    return layer;
  }
  const { legendStats, ...rest } = layer;
  if (!('defaultLegendStats' in PartitionChartsMeta[shape]?.legend)) {
    return rest;
  }
  const supportedStats = getSupportedLegendStats(legendStats) ?? [];
  return supportedStats.length ? { ...rest, legendStats: supportedStats } : rest;
};

export const checkTableForContainsSmallValues = (
  dataTable: Datatable,
  columnId: string,
  minPercentage: number
) => {
  const overallSum = dataTable.rows.reduce(
    (partialSum, row) => Number(row[columnId]) + partialSum,
    0
  );
  return dataTable.rows.some((row) => (row[columnId] / overallSum) * 100 < minPercentage);
};
