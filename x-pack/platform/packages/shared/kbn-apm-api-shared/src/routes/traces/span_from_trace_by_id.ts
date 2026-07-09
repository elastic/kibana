/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import type { Span, Transaction } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export interface SpanFromTraceByIdResponse {
  span?: Span;
  parentTransaction?: Transaction;
}

export const spanFromTraceByIdRoute = defineRoute<SpanFromTraceByIdResponse>()({
  endpoint: 'GET /internal/apm/traces/{traceId}/spans/{spanId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
      spanId: t.string,
    }),
    query: t.intersection([
      rangeRt,
      t.union([t.partial({ parentTransactionId: t.string }), t.undefined]),
    ]),
  }),
});
