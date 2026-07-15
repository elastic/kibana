/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { LatencyCorrelation } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface SignificantCorrelationsResponse {
  latencyCorrelations: LatencyCorrelation[];
  ccsWarning: boolean;
  totalDocCount: number;
  fallbackResult?: LatencyCorrelation;
}

export const significantCorrelationsTransactionsRoute =
  defineRoute<SignificantCorrelationsResponse>()({
    endpoint: 'POST /internal/apm/correlations/significant_correlations/transactions',
    params: z.object({
      body: z
        .object({
          serviceName: z.string().optional(),
          transactionName: z.string().optional(),
          transactionType: z.string().optional(),
          durationMin: z.coerce.number().optional(),
          durationMax: z.coerce.number().optional(),
        })
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema)
        .extend({
          fieldValuePairs: z.array(
            z.object({
              fieldName: z.string(),
              fieldValue: z.union([z.string(), z.coerce.number()]),
            })
          ),
        }),
    }),
  });
