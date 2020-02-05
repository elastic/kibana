/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { calculateDomain } from './calculate_domain';
import { MetricsExplorerSeries } from '../../../../server/routes/metrics_explorer/types';
import { MetricsExplorerOptionsMetric } from '../../../containers/metrics_explorer/use_metrics_explorer_options';
import { MetricsExplorerColor } from '../../../../common/color_palette';
describe('calculateDomain()', () => {
  const series: MetricsExplorerSeries = {
    id: 'test-01',
    columns: [
      { type: 'date', name: 'timestamp' },
      { type: 'number', name: 'metric_0' },
      { type: 'number', name: 'metric_1' },
      { type: 'string', name: 'groupBy' },
    ],
    rows: [
      { timestamp: 1562860500000, metric_0: null, metric_1: null },
      { timestamp: 1562860600000, metric_0: 0.1, metric_1: 0.3 },
      { timestamp: 1562860700000, metric_0: 0.5, metric_1: 0.7 },
      { timestamp: 1562860700000, metric_0: 0.4, metric_1: 0.9 },
      { timestamp: 1562860900000, metric_0: 0.01, metric_1: 0.5 },
    ],
  };
  const metrics: MetricsExplorerOptionsMetric[] = [
    {
      aggregation: 'avg',
      field: 'system.memory.free',
      color: MetricsExplorerColor.color0,
    },
    {
      aggregation: 'avg',
      field: 'system.memory.used.bytes',
      color: MetricsExplorerColor.color1,
    },
  ];
  it('should return the min and max across 2 metrics', () => {
    expect(calculateDomain(series, metrics)).toEqual({ min: 0.01, max: 0.9 });
  });
  it('should return the min and combined max across 2 metrics with 10% head room when stacked', () => {
    expect(calculateDomain(series, metrics, true)).toEqual({ min: 0.01, max: 1.4300000000000002 });
  });
});
