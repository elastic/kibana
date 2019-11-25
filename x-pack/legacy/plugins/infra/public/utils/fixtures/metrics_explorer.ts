/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  MetricsExplorerResponse,
  MetricsExplorerSeries,
} from '../../../server/routes/metrics_explorer/types';
import {
  MetricsExplorerOptions,
  MetricsExplorerTimeOptions,
  MetricsExplorerChartType,
  MetricsExplorerYAxisMode,
  MetricsExplorerChartOptions,
} from '../../containers/metrics_explorer/use_metrics_explorer_options';

export const options: MetricsExplorerOptions = {
  limit: 3,
  groupBy: 'host.name',
  aggregation: 'avg',
  metrics: [{ aggregation: 'avg', field: 'system.cpu.user.pct' }],
};

export const source = {
  name: 'default',
  description: '',
  logAlias: 'filebeat-*',
  metricAlias: 'metricbeat-*',
  logColumns: [],
  fields: {
    host: 'host.name',
    container: 'container.id',
    pod: 'kubernetes.pod.uid',
    timestamp: '@timestamp',
    message: ['message'],
    tiebreaker: '@timestamp',
  },
};

export const chartOptions: MetricsExplorerChartOptions = {
  type: MetricsExplorerChartType.line,
  yAxisMode: MetricsExplorerYAxisMode.fromZero,
  stack: false,
};

export const derivedIndexPattern = { title: 'metricbeat-*', fields: [] };

export const timeRange: MetricsExplorerTimeOptions = {
  from: 'now-1h',
  to: 'now',
  interval: '>=10s',
};

export const createSeries = (id: string): MetricsExplorerSeries => ({
  id,
  columns: [
    { name: 'timestamp', type: 'date' },
    { name: 'metric_0', type: 'number' },
    { name: 'groupBy', type: 'string' },
  ],
  rows: [
    { timestamp: 1, metric_0: 0.5, groupBy: id },
    { timestamp: 2, metric_0: 0.5, groupBy: id },
    { timestamp: 3, metric_0: 0.5, groupBy: id },
  ],
});

export const resp: MetricsExplorerResponse = {
  pageInfo: { total: 10, afterKey: 'host-04' },
  series: [createSeries('host-01'), createSeries('host-02'), createSeries('host-03')],
};
