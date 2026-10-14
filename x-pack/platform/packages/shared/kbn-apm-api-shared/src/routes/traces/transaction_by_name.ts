/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { TransactionDetailRedirectInfo } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';
import { MAX_DOCUMENT_VALUE_LENGTH, MAX_FIELD_VALUE_LENGTH } from '../../constants';

export interface TransactionByNameResponse {
  transaction?: TransactionDetailRedirectInfo;
}

export const transactionByNameRoute = defineRoute<TransactionByNameResponse>()({
  endpoint: 'GET /internal/apm/transactions',
  params: lazySchema(() =>
    z.object({
      query: rangeSchema
        .merge(
          z.object({
            transactionName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH),
            serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH),
          })
        )
        .merge(
          z.object({
            environment: z.string().max(MAX_FIELD_VALUE_LENGTH).optional(),
          })
        ),
    })
  ),
});
