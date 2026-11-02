/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';

export enum LatencyDistributionChartType {
  transactionLatency = 'transactionLatency',
  spanLatency = 'spanLatency',
  latencyCorrelations = 'latencyCorrelations',
  failedTransactionsCorrelations = 'failedTransactionsCorrelations',
  dependencyLatency = 'dependencyLatency',
}

export const latencyDistributionChartTypeSchema = z.union([
  z.literal(LatencyDistributionChartType.transactionLatency),
  z.literal(LatencyDistributionChartType.spanLatency),
  z.literal(LatencyDistributionChartType.latencyCorrelations),
  z.literal(LatencyDistributionChartType.failedTransactionsCorrelations),
  z.literal(LatencyDistributionChartType.dependencyLatency),
]);
