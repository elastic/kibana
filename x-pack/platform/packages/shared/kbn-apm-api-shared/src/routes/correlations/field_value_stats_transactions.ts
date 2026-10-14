/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { TopValuesStats } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';
import { MAX_DOCUMENT_VALUE_LENGTH, MAX_FIELD_VALUE_LENGTH } from '../../constants';

export type FieldValueStatsTransactionsResponse = TopValuesStats;

export const fieldValueStatsTransactionsRoute = defineRoute<FieldValueStatsTransactionsResponse>()({
  endpoint: 'GET /internal/apm/correlations/field_value_stats/transactions',
  params: lazySchema(() =>
    z.object({
      query: z
        .object({
          serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
          transactionName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH).optional(),
          transactionType: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
          samplerShardSize: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
        })
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema)
        .extend({
          fieldName: z.string().max(MAX_FIELD_VALUE_LENGTH),
          fieldValue: z.union([z.string().max(MAX_FIELD_VALUE_LENGTH), z.number()]),
        }),
    })
  ),
});
