/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types';
import type { Environment } from './environment_rt';

export interface FieldValuePair {
  fieldName: string;
  // For dynamic fieldValues we only identify fields as `string`,
  // but for example `http.response.status_code` which is part of
  // of the list of predefined field candidates is of type long/number.
  fieldValue: string | number;
  isFallbackResult?: boolean;
}

export interface HistogramItem {
  key: number;
  doc_count: number;
}

export interface ResponseHitSource {
  [s: string]: unknown;
}

export interface ResponseHit {
  _source: ResponseHitSource;
}

export interface CommonCorrelationsQueryParams {
  start: number;
  end: number;
  kuery: string;
  environment: Environment;
  query: QueryDslQueryContainer;
}

export type EntityType = 'transaction' | 'exit_span';
export type MetricCorrelation = 'latency' | 'failure_rate';

export interface UnifiedCorrelation {
  fieldName: string;
  fieldValue: string | number;
  correlation?: number;
  ksTest?: number;
  pValue?: number | null;
  score?: number;
  normalizedScore?: number;
  histogram?: HistogramItem[];
  isFallbackResult?: boolean;
  doc_count?: number;
  bg_count?: number;
  failurePercentage?: number;
  successPercentage?: number;
}

export interface CorrelationsResponse {
  overallHistogram?: HistogramItem[];
  errorHistogram?: HistogramItem[];
  totalDocCount: number;
  percentileThresholdValue?: number | null;
  durationMin: number;
  durationMax: number;
  fieldCandidates: string[];
  correlations: UnifiedCorrelation[];
  ccsWarning: boolean;
  fallbackResult?: UnifiedCorrelation;
}

export interface LatencyCorrelation extends FieldValuePair {
  correlation: number;
  histogram?: HistogramItem[];
  ksTest: number;
  isFallbackResult?: boolean;
}

export interface LatencyCorrelationsResponse {
  ccsWarning: boolean;
  totalDocCount?: number;
  overallHistogram?: HistogramItem[];
  percentileThresholdValue?: number | null;
  latencyCorrelations?: LatencyCorrelation[];
}

export interface FailedTransactionsCorrelation extends FieldValuePair {
  doc_count: number;
  bg_count: number;
  score: number;
  pValue: number | null;
  normalizedScore: number;
  failurePercentage: number;
  successPercentage: number;
  /** Present when histograms were requested (default for legacy p-values API). */
  histogram?: HistogramItem[];
}

export type FailedTransactionsCorrelationsImpactThreshold = string;

export interface FailedTransactionsCorrelationsResponse {
  ccsWarning: boolean;
  failedTransactionsCorrelations?: FailedTransactionsCorrelation[];
  percentileThresholdValue?: number | null;
  overallHistogram?: HistogramItem[];
  totalDocCount?: number;
  errorHistogram?: HistogramItem[];
  fallbackResult?: FailedTransactionsCorrelation;
}

export interface TopValueBucket {
  key: string | number;
  doc_count: number;
}

export interface TopValuesStats {
  count?: number;
  fieldName: string;
  topValues: TopValueBucket[];
  topValuesSampleSize: number;
  isTopValuesSampled?: boolean;
  topValuesSamplerShardSize?: number;
}

export type FieldValueFieldStats = TopValuesStats;
