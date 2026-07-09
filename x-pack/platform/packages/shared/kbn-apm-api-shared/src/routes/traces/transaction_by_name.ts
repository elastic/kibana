/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { TransactionDetailRedirectInfo } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export interface TransactionByNameResponse {
  transaction?: TransactionDetailRedirectInfo;
}

export const transactionByNameRoute = defineRoute<TransactionByNameResponse>()({
  endpoint: 'GET /internal/apm/transactions',
  params: t.type({
    query: t.intersection([
      rangeRt,
      t.type({
        transactionName: t.string,
        serviceName: t.string,
      }),
      t.partial({
        environment: t.string,
      }),
    ]),
  }),
});
