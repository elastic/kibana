/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { environmentRt } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kueryRt, rangeRt, offsetRt } from '../../default_api_types';
import type { ColdstartRateResponse } from './coldstart_rate';

export type ColdstartRateByTransactionNameResponse = ColdstartRateResponse;

export const transactionChartsColdstartRateByTransactionNameRoute =
  defineRoute<ColdstartRateByTransactionNameResponse>()({
    endpoint:
      'GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name',
    params: t.type({
      path: t.type({ serviceName: t.string }),
      query: t.intersection([
        t.type({ transactionType: t.string, transactionName: t.string }),
        t.intersection([environmentRt, kueryRt, rangeRt, offsetRt]),
      ]),
    }),
  });
