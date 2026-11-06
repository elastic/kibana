/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { latencyOverallTransactionDistributionRoute } from './overall_transaction_distribution';
import { latencyOverallSpanDistributionRoute } from './overall_span_distribution';

export const latencyDistributionRouteDefinitions = {
  overallTransactionDistribution: latencyOverallTransactionDistributionRoute,
  overallSpanDistribution: latencyOverallSpanDistributionRoute,
};

export type { LatencyOverallTransactionDistributionResponse } from './overall_transaction_distribution';
export type { LatencyOverallSpanDistributionResponse } from './overall_span_distribution';
