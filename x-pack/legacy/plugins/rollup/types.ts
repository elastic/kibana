/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export type RollupJobMetricType = 'max' | 'min' | 'value_count';

export interface RollupJobTerm {
  name: string;
}

export interface RollupJobHistogramEntry {
  name: string;
}

export interface RollupJobMetric {
  name: string;
  types: RollupJobMetricType[];
}

export interface RollupJob {
  id: string;
  indexPattern: string;
  rollupIndex: string;
  rollupCron: string;
  dateHistogramInterval: string;
  rollupDelay: string;
  dateHistogramTimeZone: string;
  dateHistogramField: string;
  status: string;
  metrics: RollupJobMetric[];
  terms: RollupJobTerm[];
  histogram: RollupJobHistogramEntry[];
  documentsProcessed: number;
  pagesProcessed: number;
  rollupsIndexed: number;
  triggerCount: number;
  json: { [key: string]: any };
  histogramInterval: number;
}
