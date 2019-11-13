/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { min, max, sum } from 'lodash';
import { MetricsExplorerSeries } from '../../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptionsMetric } from '../../../containers/metrics_explorer/use_metrics_explorer_options';

export const calculateDomain = (
  series: MetricsExplorerSeries,
  metrics: MetricsExplorerOptionsMetric[],
  stacked = false
): { min: number; max: number } => {
  const values = series.rows
    .reduce((acc, row) => {
      const rowValues = metrics
        .map((m, index) => {
          return (row[`metric_${index}`] as number) || null;
        })
        .filter(v => v);
      const minValue = min(rowValues);
      // For stacked domains we want to add 10% head room so the charts have
      // enough room to draw the 2 pixel line as well.
      const maxValue = stacked ? sum(rowValues) * 1.1 : max(rowValues);
      return acc.concat([minValue || null, maxValue || null]);
    }, [] as Array<number | null>)
    .filter(v => v);
  return { min: min(values) || 0, max: max(values) || 0 };
};
