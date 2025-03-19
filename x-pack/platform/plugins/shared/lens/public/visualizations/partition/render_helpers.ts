/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LegendValue } from '@elastic/charts';
import type { Datatable } from '@kbn/expressions-plugin/public';
import type { PieChartType, PieLayerState } from '../../../common/types';
import { PartitionChartsMeta } from './partition_charts_meta';

export const getLegendStats = (layer: PieLayerState, shape: PieChartType) => {
  if ('defaultLegendStats' in PartitionChartsMeta[shape]?.legend) {
    return (
      layer.legendStats ??
      PartitionChartsMeta[shape].legend.defaultLegendStats ?? [LegendValue.Value]
    );
  }
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
