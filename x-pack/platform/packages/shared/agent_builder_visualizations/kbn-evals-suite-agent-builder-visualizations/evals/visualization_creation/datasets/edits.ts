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
  editExample,
  partitionExample,
  timeSeriesQuery,
  withDataSource,
  xyExample,
} from './factories';

const LOGS = 'kibana_sample_data_logs';
const ECOMMERCE = 'kibana_sample_data_ecommerce';
const REQUEST_COUNT = { alias: 'Request Count', expression: 'COUNT(*)' };
const TOTAL_BYTES = { alias: 'Total Bytes', expression: 'SUM(bytes)' };
const TOTAL_REVENUE = { alias: 'Total Revenue', expression: 'SUM(taxful_total_price)' };
const ORDER_COUNT = { alias: 'Order Count', expression: 'COUNT(*)' };

/** Second-turn edits; the gold is the chart after the edit. */
export const VISUALIZATION_EDIT_EXAMPLES: VisualizationDatasetExample[] = [
  ...withDataSource('logs', [
    editExample({
      create: 'Create a bar chart of request counts by response code in kibana_sample_data_logs.',
      edit: 'Make the bars horizontal.',
      gold: xyExample({
        question: 'unused',
        seriesType: 'bar_horizontal',
        query: categoricalQuery({
          index: LOGS,
          metrics: [REQUEST_COUNT],
          groupBy: 'response.keyword',
        }),
        x: 'response.keyword',
        y: [REQUEST_COUNT.alias],
      }),
    }),
    editExample({
      create: 'Create a line chart of total bytes over time in kibana_sample_data_logs.',
      edit: 'Split it into one line per response code.',
      gold: xyExample({
        question: 'unused',
        seriesType: 'line',
        query: timeSeriesQuery({
          index: LOGS,
          metrics: [TOTAL_BYTES],
          splitBy: 'response.keyword',
        }),
        x: TIME_BUCKET_COLUMN,
        y: [TOTAL_BYTES.alias],
        breakdownBy: 'response.keyword',
      }),
    }),
    editExample({
      create:
        'Create a single metric visualization showing the total number of requests in kibana_sample_data_logs.',
      edit: 'Show it as a pie chart broken down by operating system instead.',
      gold: partitionExample({
        question: 'unused',
        type: 'pie',
        query: categoricalQuery({
          index: LOGS,
          metrics: [REQUEST_COUNT],
          groupBy: 'machine.os.keyword',
        }),
        metrics: [REQUEST_COUNT.alias],
        groupBy: ['machine.os.keyword'],
      }),
    }),
  ]),
  ...withDataSource('ecommerce', [
    editExample({
      create: 'Create a line chart of total revenue over time in kibana_sample_data_ecommerce.',
      edit: 'Add the number of orders as a second line.',
      gold: xyExample({
        question: 'unused',
        seriesType: 'line',
        query: timeSeriesQuery({
          index: ECOMMERCE,
          metrics: [TOTAL_REVENUE, ORDER_COUNT],
          timeField: 'order_date',
        }),
        x: TIME_BUCKET_COLUMN,
        y: [TOTAL_REVENUE.alias, ORDER_COUNT.alias],
      }),
    }),
  ]),
];
