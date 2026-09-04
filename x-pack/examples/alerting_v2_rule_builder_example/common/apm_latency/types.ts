/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LATENCY_PERCENTILES } from './constants';

export type LatencyPercentile = (typeof LATENCY_PERCENTILES)[number];

/**
 * Parameters stored on the rule as `metadata.builder_fields`, and the only input
 * the generated ES|QL is derived from.
 */
export interface ApmLatencyBuilderFields {
  /** Index pattern the query reads from. */
  index: string;
  /** Time field used for the lookback window range filter. */
  timeField: string;
  serviceName: string;
  environment?: string;
  transactionType?: string;
  percentile: LatencyPercentile;
  thresholdMs: number;
  /** Alerts per endpoint instead of per service. */
  groupByTransactionName: boolean;
  /** Recovery threshold in ms; defaults to `thresholdMs` when omitted. */
  recoveryThresholdMs?: number;
}
