/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { z } from '@kbn/zod/v4';

export enum LatencyDistributionChartType {
  transactionLatency = 'transactionLatency',
  spanLatency = 'spanLatency',
  latencyCorrelations = 'latencyCorrelations',
  failedTransactionsCorrelations = 'failedTransactionsCorrelations',
  dependencyLatency = 'dependencyLatency',
}

export const latencyDistributionChartTypeRt = t.union([
  t.literal(LatencyDistributionChartType.transactionLatency),
  t.literal(LatencyDistributionChartType.spanLatency),
  t.literal(LatencyDistributionChartType.latencyCorrelations),
  t.literal(LatencyDistributionChartType.failedTransactionsCorrelations),
  t.literal(LatencyDistributionChartType.dependencyLatency),
]);

/**
 * zod equivalent, additive (see `default_api_types.ts` in `@kbn/apm-api-shared`
 * for why - elastic/kibana#243355).
 */
export const latencyDistributionChartTypeSchema = z.union([
  z.literal(LatencyDistributionChartType.transactionLatency),
  z.literal(LatencyDistributionChartType.spanLatency),
  z.literal(LatencyDistributionChartType.latencyCorrelations),
  z.literal(LatencyDistributionChartType.failedTransactionsCorrelations),
  z.literal(LatencyDistributionChartType.dependencyLatency),
]);
