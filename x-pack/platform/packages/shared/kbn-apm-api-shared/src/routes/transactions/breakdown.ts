/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

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
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: z
      .object({ transactionType: z.string() })
      .merge(z.object({ transactionName: z.string() }).partial())
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema),
  }),
});
