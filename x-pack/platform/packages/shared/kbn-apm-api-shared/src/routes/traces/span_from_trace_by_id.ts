/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { Span, Transaction } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface SpanFromTraceByIdResponse {
  span?: Span;
  parentTransaction?: Transaction;
}

export const spanFromTraceByIdRoute = defineRoute<SpanFromTraceByIdResponse>()({
  endpoint: 'GET /internal/apm/traces/{traceId}/spans/{spanId}',
  params: z.object({
    path: z.object({
      traceId: z.string(),
      spanId: z.string(),
    }),
    query: rangeSchema.merge(z.object({ parentTransactionId: z.string().optional() })),
  }),
});
