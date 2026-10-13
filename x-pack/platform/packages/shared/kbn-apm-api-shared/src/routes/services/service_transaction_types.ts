/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import { rangeSchema, serviceTransactionDataSourceSchema } from '../../default_api_types';
import { MAX_FIELD_VALUE_LENGTH } from '../../constants';

export interface ServiceTransactionTypesResponse {
  transactionTypes: string[];
}

export const serviceTransactionTypesRoute = defineRoute<ServiceTransactionTypesResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/transaction_types',
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH) }),
      query: rangeSchema.merge(serviceTransactionDataSourceSchema),
    })
  ),
});
