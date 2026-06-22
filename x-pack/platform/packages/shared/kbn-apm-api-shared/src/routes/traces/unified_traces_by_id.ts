/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toBooleanRt } from '@kbn/io-ts-utils';
import type { Error as ApmError, TraceItem, Transaction } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeRt } from '../../default_api_types';

export interface UnifiedTracesByIdResponse {
  traceItems: TraceItem[];
  errors: ApmError[];
  agentMarks: Record<string, number>;
  entryTransaction?: Transaction;
  traceDocsTotal: number;
  maxTraceItems: number;
}

export const unifiedTracesByIdRoute = defineRoute<UnifiedTracesByIdResponse>()({
  endpoint: 'GET /internal/apm/unified_traces/{traceId}',
  params: t.type({
    path: t.type({
      traceId: t.string,
    }),
    query: t.intersection([
      rangeRt,
      t.partial({
        serviceName: t.string,
        entryTransactionId: t.string,
        ecsOnly: toBooleanRt,
      }),
    ]),
  }),
});
