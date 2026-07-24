/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface FallbackToTransactionsResponse {
  fallbackToTransactions: boolean;
}

export const fallbackToTransactionsRoute = defineRoute<FallbackToTransactionsResponse>()({
  endpoint: 'GET /internal/apm/fallback_to_transactions',
  params: z.object({
    query: kuerySchema.merge(rangeSchema.partial()).optional(),
  }),
});
