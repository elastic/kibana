/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { Transaction } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export type TransactionFromTraceByIdResponse = Transaction;

export const transactionFromTraceByIdRoute = defineRoute<TransactionFromTraceByIdResponse>()({
  endpoint: 'GET /internal/apm/traces/{traceId}/transactions/{transactionId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
      transactionId: t.string,
    }),
    query: rangeRt,
  }),
});
