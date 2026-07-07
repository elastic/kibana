/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export * from './lib/date_range_info';
export * from './lib/build_agg';
export * from './lib/parse_aggregation_results';
export interface TimeSeriesResult {
  results: TimeSeriesResultRow[];
  truncated: boolean;
}

export interface TimeSeriesResultRow {
  group: string;
  metrics: MetricResult[];
}

export type MetricResult = [string, number]; // [iso date, value]
