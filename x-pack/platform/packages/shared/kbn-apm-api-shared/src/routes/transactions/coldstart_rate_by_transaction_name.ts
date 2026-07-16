/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';
import type { ColdstartRateResponse } from './coldstart_rate';

export type ColdstartRateByTransactionNameResponse = ColdstartRateResponse;

export const transactionChartsColdstartRateByTransactionNameRoute =
  defineRoute<ColdstartRateByTransactionNameResponse>()({
    endpoint:
      'GET /internal/apm/services/{serviceName}/transactions/charts/coldstart_rate_by_transaction_name',
    params: z.object({
      path: z.object({ serviceName: z.string() }),
      query: z
        .object({ transactionType: z.string(), transactionName: z.string() })
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema)
        .merge(offsetSchema),
    }),
  });
