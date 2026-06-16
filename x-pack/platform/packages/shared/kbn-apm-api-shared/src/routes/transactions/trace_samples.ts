/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export interface TransactionTraceSamplesResponse {
  traceSamples: Array<{
    score: number | null | undefined;
    timestamp: string;
    transactionId: string;
    traceId: string;
  }>;
}

export const transactionTraceSamplesRoute = defineRoute<TransactionTraceSamplesResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/traces/samples',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      t.type({ transactionType: t.string, transactionName: t.string }),
      t.partial({
        transactionId: t.string,
        traceId: t.string,
        sampleRangeFrom: toNumberRt,
        sampleRangeTo: toNumberRt,
      }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
});
