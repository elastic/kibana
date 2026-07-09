/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt } from '../../default_api_types';

export interface TransactionBreakdownResponse {
  timeseries: Array<{
    title: string;
    type: string;
    data: Array<{ x: number; y: number | null }>;
    hideLegend: boolean;
    legendValue: any;
  }>;
}

export const transactionChartsBreakdownRoute = defineRoute<TransactionBreakdownResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/transaction/charts/breakdown',
  params: t.type({
    path: t.type({ serviceName: t.string }),
    query: t.intersection([
      t.type({ transactionType: t.string }),
      t.partial({ transactionName: t.string }),
      environmentRt,
      kueryRt,
      rangeRt,
    ]),
  }),
});
