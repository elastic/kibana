/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface TransactionTraceSamplesResponse {
  traceSamples: Array<{
    score: number | null | undefined;
    timestamp: string;
    transactionId: string;
    traceId: string;
  }>;
}

export const transactionTraceSamplesRoute = defineRoute<TransactionTraceSamplesResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/traces/samples',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: z
      .object({ transactionType: z.string(), transactionName: z.string() })
      .merge(
        z
          .object({
            transactionId: z.string(),
            traceId: z.string(),
            sampleRangeFrom: z.coerce.number(),
            sampleRangeTo: z.coerce.number(),
          })
          .partial()
      )
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema),
  }),
});
