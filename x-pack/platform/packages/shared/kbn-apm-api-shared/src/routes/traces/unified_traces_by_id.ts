/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import type { Error as ApmError, TraceItem, Transaction } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface UnifiedTracesByIdResponse {
  traceItems: TraceItem[];
  errors: ApmError[];
  agentMarks: Record<string, number>;
  entryTransaction?: Transaction;
  traceDocsTotal: number;
  maxTraceItems: number;
}

export const unifiedTracesByIdRoute = defineRoute<UnifiedTracesByIdResponse>()({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}',
  params: z.object({
    path: z.object({
      traceId: z.string(),
    }),
    query: rangeSchema.merge(
      z.object({
        serviceName: z.string().optional(),
        entryTransactionId: z.string().optional(),
        ecsOnly: BooleanFromString.optional(),
      })
    ),
  }),
});
