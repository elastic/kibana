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

export interface DurationFieldCandidatesResponse {
  fieldCandidates: string[];
}

export const fieldCandidatesTransactionsRoute = defineRoute<DurationFieldCandidatesResponse>()({
  endpoint: 'GET /internal/apm/correlations/field_candidates/transactions',
  params: z.object({
    query: z
      .object({
        serviceName: z.string().optional(),
        transactionName: z.string().optional(),
        transactionType: z.string().optional(),
      })
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema),
  }),
});
