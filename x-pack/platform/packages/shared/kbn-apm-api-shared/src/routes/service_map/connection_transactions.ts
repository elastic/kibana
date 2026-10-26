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
import { connectionDependenciesSchema } from './connection_params';

/**
 * A single endpoint group in the source service that calls the target connection.
 * All latency/call metrics are measured from the source's exit spans, not the
 * full transaction duration.
 */
export interface ConnectionTransactionGroup {
  name: string;
  /** Most frequent transaction type — needed to open the transaction detail flyout. */
  transactionType: string;
  /** Average exit span duration for calls to the target, in µs. */
  avgCallLatency: number | null;
  /** Exit span calls per minute to the target. */
  callRate: number | null;
  /** Total call count in the time window. */
  callCount: number;
  /** Failed exit span rate 0-1. Null if no outcome data. */
  failedCallRate: number | null;
  /** This group's share of total exit span time for the connection, 0-1. */
  timeConsumedPct: number | null;
}

export interface ConnectionTransactionsResponse {
  transactionGroups: ConnectionTransactionGroup[];
  /** True when the calls of the connection were capped and the oldest ones are left out. */
  isSampled: boolean;
}

export const serviceMapConnectionTransactionsRoute = defineRoute<ConnectionTransactionsResponse>()({
  endpoint: 'GET /internal/apm/service-map/connection/transactions',
  params: lazySchema(() =>
    z.object({
      query: z
        .object({
          sourceServiceName: z.string(),
          /**
           * span.destination.service.resource values of the connection. Needed for
           * service→dependency edges; service→service edges are matched on the parent span.
           */
          dependencies: connectionDependenciesSchema.default([]),
          /** Set for service→service edges. */
          targetServiceName: z.string().optional(),
        })
        .merge(environmentSchema)
        .merge(rangeSchema)
        .refine(
          ({ dependencies, targetServiceName }) => dependencies.length > 0 || !!targetServiceName,
          {
            message: 'Either dependencies or targetServiceName is required',
          }
        ),
    })
  ),
});
