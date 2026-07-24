/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import { rangeSchema, serviceTransactionDataSourceSchema } from '../../default_api_types';

export interface ServiceTransactionTypesResponse {
  transactionTypes: string[];
}

export const serviceTransactionTypesRoute = defineRoute<ServiceTransactionTypesResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/transaction_types',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: rangeSchema.merge(serviceTransactionDataSourceSchema),
  }),
});
