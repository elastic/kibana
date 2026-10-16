/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { FieldValuePair } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';
import {
  MAX_ARRAY_ITEMS,
  MAX_DOCUMENT_VALUE_LENGTH,
  MAX_FIELD_VALUE_LENGTH,
} from '../../constants';

export interface FieldValuePairsResponse {
  fieldValuePairs: FieldValuePair[];
  errors: any[];
}

export const fieldValuePairsTransactionsRoute = defineRoute<FieldValuePairsResponse>()({
  endpoint: 'POST /internal/apm/correlations/field_value_pairs/transactions',
  params: lazySchema(() =>
    z.object({
      body: z
        .object({
          serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
          transactionName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH).optional(),
          transactionType: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
        })
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema)
        .extend({
          fieldCandidates: z.array(z.string().max(MAX_FIELD_VALUE_LENGTH)).max(MAX_ARRAY_ITEMS),
        }),
    })
  ),
});
