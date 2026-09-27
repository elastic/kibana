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
  metricExample,
  partitionExample,
  timeSeriesQuery,
  totalsQuery,
  withDataSource,
  xyExample,
} from './factories';

const INDEX = 'kibana_sample_data_ecommerce';
const TIME_FIELD = 'order_date';
const TOTAL_REVENUE = { alias: 'Total Revenue', expression: 'SUM(taxful_total_price)' };
const ORDER_COUNT = { alias: 'Order Count', expression: 'COUNT(*)' };
const TOTAL_QUANTITY = { alias: 'Total Quantity', expression: 'SUM(total_quantity)' };

/** kibana_sample_data_ecommerce: metric, pie, and xy over order_date and revenue fields. */
export const ECOMMERCE_EXAMPLES: VisualizationDatasetExample[] = withDataSource('ecommerce', [
  metricExample({
    question:
      'Create a metric visualization of total revenue (taxful_total_price) in kibana_sample_data_ecommerce.',
    query: totalsQuery({ index: INDEX, metrics: [TOTAL_REVENUE], timeField: TIME_FIELD }),
    metrics: [TOTAL_REVENUE.alias],
  }),
  metricExample({
    question:
      'Create a metric visualization of total revenue in kibana_sample_data_ecommerce with the order count as a secondary metric.',
    query: totalsQuery({
      index: INDEX,
      metrics: [TOTAL_REVENUE, ORDER_COUNT],
      timeField: TIME_FIELD,
    }),
    metrics: [TOTAL_REVENUE.alias, ORDER_COUNT.alias],
  }),
  partitionExample({
    question: 'Create a pie chart of order counts by category in kibana_sample_data_ecommerce.',
    type: 'pie',
    query: categoricalQuery({
      index: INDEX,
      metrics: [ORDER_COUNT],
      groupBy: 'category.keyword',
      timeField: TIME_FIELD,
    }),
    metrics: [ORDER_COUNT.alias],
    groupBy: ['category.keyword'],
  }),
  xyExample({
    question: 'Create a line chart of total revenue over time in kibana_sample_data_ecommerce.',
    seriesType: 'line',
    query: timeSeriesQuery({ index: INDEX, metrics: [TOTAL_REVENUE], timeField: TIME_FIELD }),
    x: TIME_BUCKET_COLUMN,
    y: [TOTAL_REVENUE.alias],
  }),
  xyExample({
    question:
      'Create a bar chart of total quantity sold by manufacturer in kibana_sample_data_ecommerce.',
    seriesType: ['bar', 'bar_horizontal'],
    query: categoricalQuery({
      index: INDEX,
      metrics: [TOTAL_QUANTITY],
      groupBy: 'manufacturer.keyword',
      timeField: TIME_FIELD,
    }),
    x: 'manufacturer.keyword',
    y: [TOTAL_QUANTITY.alias],
  }),
]);
