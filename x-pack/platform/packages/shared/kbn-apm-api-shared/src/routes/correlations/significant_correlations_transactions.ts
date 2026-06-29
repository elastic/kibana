/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { toNumberRt } from '@kbn/io-ts-utils';
import type { LatencyCorrelation } from '@kbn/apm-types';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export interface SignificantCorrelationsResponse {
  latencyCorrelations: LatencyCorrelation[];
  ccsWarning: boolean;
  totalDocCount: number;
  fallbackResult?: LatencyCorrelation;
}

export const significantCorrelationsTransactionsRoute =
  defineRoute<SignificantCorrelationsResponse>()({
    endpoint: 'POST /internal/apm/correlations/significant_correlations/transactions',
    params: t.type({
      body: t.intersection([
        t.partial({
          serviceName: t.string,
          transactionName: t.string,
          transactionType: t.string,
          durationMin: toNumberRt,
          durationMax: toNumberRt,
        }),
        environmentRt,
        kueryRt,
        rangeRt,
        t.type({
          fieldValuePairs: t.array(
            t.type({
              fieldName: t.string,
              fieldValue: t.union([t.string, toNumberRt]),
            })
          ),
        }),
      ]),
    }),
  });
