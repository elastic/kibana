/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';
import { MAX_FIELD_VALUE_LENGTH, MAX_NUM_BUCKETS } from '../../constants';

export interface TopErroneousTransactionsResponse {
  topErroneousTransactions: Array<{
    transactionName: string;
    currentPeriodTimeseries: Array<{ x: number; y: number }>;
    previousPeriodTimeseries: Array<{ x: number; y: number }>;
    transactionType: string | undefined;
    occurrences: number;
  }>;
}

export const topErroneousTransactionsRoute = defineRoute<TopErroneousTransactionsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/errors/{groupId}/top_erroneous_transactions',
  params: lazySchema(() =>
    z.object({
      path: z.object({
        serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH),
        groupId: z.string().max(MAX_FIELD_VALUE_LENGTH),
      }),
      query: environmentSchema
        .merge(kuerySchema)
        .merge(rangeSchema)
        .merge(offsetSchema)
        .merge(z.object({ numBuckets: z.coerce.number().int().min(1).max(MAX_NUM_BUCKETS) })),
    })
  ),
});
