/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { TransactionDetailRedirectInfo } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface TransactionByNameResponse {
  transaction?: TransactionDetailRedirectInfo;
}

export const transactionByNameRoute = defineRoute<TransactionByNameResponse>()({
  endpoint: 'GET /internal/apm/transactions',
  params: z.object({
    query: rangeSchema
      .merge(
        z.object({
          transactionName: z.string(),
          serviceName: z.string(),
        })
      )
      .merge(
        z.object({
          environment: z.string().optional(),
        })
      ),
  }),
});
