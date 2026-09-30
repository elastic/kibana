/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

/**
 * A single endpoint group in the source service that calls the target connection.
 * All latency/call metrics are measured from the source's exit spans, not the
 * full transaction duration.
 */
export interface ConnectionTransactionGroup {
  name: string;
  /** Most frequent transaction type — needed to open the transaction detail flyout. */
  transactionType: string;
  /** Average exit span duration for calls to the target, in µs. Null for unresolved OTel groups. */
  avgCallLatency: number | null;
  /** Exit span calls per minute to the target. */
  callRate: number | null;
  /** Total call count in the time window. */
  callCount: number;
  /** Failed exit span rate 0-1. Null if no outcome data. */
  failedCallRate: number | null;
  /** This group's share of total exit span time for the connection, 0-1. */
  timeConsumedPct: number | null;
  /** True when the result set was capped by MAX_IDS — values may be biased. */
  isSampled: boolean;
}

export interface ConnectionTransactionsResponse {
  transactionGroups: ConnectionTransactionGroup[];
  /** True if the Phase 1 ID collection was capped at MAX_IDS = 1 000. */
  isMaxTransactionsReached: boolean;
}

export const serviceMapConnectionTransactionsRoute = defineRoute<ConnectionTransactionsResponse>()({
  endpoint: 'GET /internal/apm/service-map/connection/transactions',
  params: lazySchema(() =>
    z.object({
      query: z
        .object({
          sourceServiceName: z.string(),
          /**
           * span.destination.service.resource values for the connection.
           * Optional — absent for service→service edges where only targetServiceName is used.
           */
          dependencies: z.union([z.string(), z.array(z.string())]).optional(),
          /** Set for service→service edges — triggers a parent-span join instead of resource-based. */
          targetServiceName: z.string().optional(),
        })
        .merge(environmentSchema)
        .merge(rangeSchema),
    })
  ),
});
