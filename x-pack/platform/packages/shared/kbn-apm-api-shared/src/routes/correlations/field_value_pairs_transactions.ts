/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { FieldValuePair } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface FieldValuePairsResponse {
  fieldValuePairs: FieldValuePair[];
  errors: any[];
}

export const fieldValuePairsTransactionsRoute = defineRoute<FieldValuePairsResponse>()({
  endpoint: 'POST /internal/apm/correlations/field_value_pairs/transactions',
  params: z.object({
    body: z
      .object({
        serviceName: z.string().optional(),
        transactionName: z.string().optional(),
        transactionType: z.string().optional(),
      })
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema)
      .extend({
        fieldCandidates: z.array(z.string()),
      }),
  }),
});
