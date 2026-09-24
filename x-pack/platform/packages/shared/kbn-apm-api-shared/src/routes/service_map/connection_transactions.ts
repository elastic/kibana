/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { environmentSchema, latencyAggregationTypeSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

/** A single transaction group in the source service that calls the target connection. */
export interface ConnectionTransactionGroup {
  name: string;
  /** Most frequent transaction type for this group — needed to open the detail flyout. */
  transactionType: string;
  /** Avg/p95/p99 latency in microseconds, based on latencyAggregationType. */
  latency: number | null;
  /** Transactions per minute. */
  throughput: number | null;
  /** Failed transaction rate 0-1. */
  errorRate: number | null;
  /** True when the result set was capped by MAX_TRANSACTION_IDS (1 000) — values may be biased. */
  isSampled: boolean;
}

export interface ConnectionTransactionsResponse {
  transactionGroups: ConnectionTransactionGroup[];
  /** True if the exit span join was capped at MAX_TRANSACTION_IDS = 1 000. */
  isMaxTransactionsReached: boolean;
}

export const serviceMapConnectionTransactionsRoute = defineRoute<ConnectionTransactionsResponse>()({
  endpoint: 'GET /internal/apm/service-map/connection/transactions',
  params: lazySchema(() =>
    z.object({
      query: z
        .object({
          sourceServiceName: z.string(),
          dependencies: z.union([z.string(), z.array(z.string())]),
          /** Set for service→service edges — triggers a trace-level join instead of resource-based. */
          targetServiceName: z.string().optional(),
        })
        .merge(z.object({ latencyAggregationType: latencyAggregationTypeSchema }).partial())
        .merge(environmentSchema)
        .merge(rangeSchema),
    })
  ),
});
