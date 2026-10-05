/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationDatasetExample } from '../../../src/evaluate_dataset';
import {
  TIME_BUCKET_COLUMN,
  categoricalQuery,
  withDataSource,
  dataTableExample,
  gaugeExample,
  heatmapExample,
  metricExample,
  partitionExample,
  queryOnlyExample,
  tagCloudExample,
  timeSeriesQuery,
  totalsQuery,
  xyExample,
} from './factories';

const INDEX = 'kibana_sample_data_logs';
const REQUEST_COUNT = { alias: 'Request Count', expression: 'COUNT(*)' };
const TOTAL_BYTES = { alias: 'Total Bytes', expression: 'SUM(bytes)' };
const AVERAGE_BYTES = { alias: 'Average Bytes', expression: 'AVG(bytes)' };

/** kibana_sample_data_logs: one example per core Lens chart type plus a multi-series line. */
export const LOGS_EXAMPLES: VisualizationDatasetExample[] = withDataSource('logs', [
  xyExample({
    question:
      'Create a bar chart of the number of requests by response code in kibana_sample_data_logs.',
    seriesType: ['bar', 'bar_horizontal'],
    query: categoricalQuery({
      index: INDEX,
      metrics: [REQUEST_COUNT],
      groupBy: 'response.keyword',
    }),
    x: 'response.keyword',
    y: [REQUEST_COUNT.alias],
  }),
  metricExample({
    question:
      'Create a single metric visualization showing the total number of requests in kibana_sample_data_logs.',
    query: totalsQuery({
      index: INDEX,
      metrics: [{ alias: 'Total Requests', expression: 'COUNT(*)' }],
    }),
    metrics: ['Total Requests'],
  }),
  xyExample({
    question: 'Create a line chart of total bytes over time in kibana_sample_data_logs.',
    seriesType: 'line',
    query: timeSeriesQuery({ index: INDEX, metrics: [TOTAL_BYTES] }),
    x: TIME_BUCKET_COLUMN,
    y: [TOTAL_BYTES.alias],
  }),
  partitionExample({
    question: 'Create a pie chart of request counts by response code in kibana_sample_data_logs.',
    type: 'pie',
    query: categoricalQuery({
      index: INDEX,
      metrics: [REQUEST_COUNT],
      groupBy: 'response.keyword',
    }),
    metrics: [REQUEST_COUNT.alias],
    groupBy: ['response.keyword'],
  }),
  xyExample({
    question:
      'Create a horizontal bar chart of the top operating systems by request count in kibana_sample_data_logs.',
    seriesType: 'bar_horizontal',
    query: categoricalQuery({
      index: INDEX,
      metrics: [REQUEST_COUNT],
      groupBy: 'machine.os.keyword',
    }),
    x: 'machine.os.keyword',
    y: [REQUEST_COUNT.alias],
  }),
  tagCloudExample({
    question: 'Create a tag cloud of file extensions by request count in kibana_sample_data_logs.',
    query: categoricalQuery({
      index: INDEX,
      metrics: [REQUEST_COUNT],
      groupBy: 'extension.keyword',
    }),
    metric: REQUEST_COUNT.alias,
    tagBy: 'extension.keyword',
  }),
  dataTableExample({
    question:
      'Create a data table of the top 10 URLs by request count in kibana_sample_data_logs, including total bytes for each URL.',
    query: categoricalQuery({
      index: INDEX,
      metrics: [REQUEST_COUNT, TOTAL_BYTES],
      groupBy: 'url.keyword',
    }),
    rows: ['url.keyword'],
    metrics: [REQUEST_COUNT.alias, TOTAL_BYTES.alias],
  }),
  heatmapExample({
    question:
      'Create a heatmap of request counts by hour of day and response code in kibana_sample_data_logs.',
    query: `FROM ${INDEX}
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| EVAL hour = DATE_EXTRACT("HOUR_OF_DAY", @timestamp)
| STATS \`Request Count\` = COUNT(*) BY hour, response.keyword`,
    x: 'hour',
    y: 'response.keyword',
    metric: REQUEST_COUNT.alias,
  }),
  partitionExample({
    question: 'Create a treemap of request counts by host in kibana_sample_data_logs.',
    type: 'treemap',
    query: categoricalQuery({ index: INDEX, metrics: [REQUEST_COUNT], groupBy: 'host.keyword' }),
    metrics: [REQUEST_COUNT.alias],
    groupBy: ['host.keyword'],
  }),
  gaugeExample({
    question: 'Show average bytes per request as a gauge for kibana_sample_data_logs.',
    query: totalsQuery({ index: INDEX, metrics: [AVERAGE_BYTES] }),
    metric: AVERAGE_BYTES.alias,
  }),
  // --- Config API surface beyond basic column roles ---
  xyExample({
    question:
      'Create a line chart of request count over time in kibana_sample_data_logs, with one line per response code.',
    seriesType: 'line',
    query: timeSeriesQuery({
      index: INDEX,
      metrics: [REQUEST_COUNT],
      splitBy: 'response.keyword',
    }),
    x: TIME_BUCKET_COLUMN,
    y: [REQUEST_COUNT.alias],
    breakdownBy: 'response.keyword',
  }),
  xyExample({
    question:
      'Create a stacked bar chart of total bytes by operating system in kibana_sample_data_logs, stacked by response code.',
    seriesType: 'bar_stacked',
    query: categoricalQuery({
      index: INDEX,
      metrics: [TOTAL_BYTES],
      groupBy: 'machine.os.keyword, response.keyword',
      limit: 50,
    }),
    x: 'machine.os.keyword',
    y: [TOTAL_BYTES.alias],
    breakdownBy: 'response.keyword',
  }),
  metricExample({
    question:
      'Show the number of requests per operating system in kibana_sample_data_logs as metric tiles, one per OS.',
    query: categoricalQuery({
      index: INDEX,
      metrics: [REQUEST_COUNT],
      groupBy: 'machine.os.keyword',
    }),
    metrics: [REQUEST_COUNT.alias],
    breakdownBy: 'machine.os.keyword',
  }),
  // Multi-series over time is valid as Lens xy or Vega; score ES|QL
  // equivalence rather than forcing a single renderer/chart_type.
  queryOnlyExample({
    question:
      'Create a line chart of request count and average bytes over time in kibana_sample_data_logs as two series.',
    query: timeSeriesQuery({ index: INDEX, metrics: [REQUEST_COUNT, AVERAGE_BYTES] }),
  }),
]);
