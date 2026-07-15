/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { type Coordinate } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  kuerySchema,
  rangeSchema,
  offsetSchema,
  filtersSchema,
  serviceTransactionDataSourceSchema,
} from '../../default_api_types';

export interface FailedTransactionRateResponse {
  currentPeriod: {
    timeseries: Coordinate[];
    average: number | null;
  };
  previousPeriod: {
    timeseries: Coordinate[];
    average: number | null;
  };
}

export const transactionChartsErrorRateRoute = defineRoute<FailedTransactionRateResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/charts/error_rate',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: z
      .object({ transactionType: z.string(), bucketSizeInSeconds: z.coerce.number() })
      .merge(z.object({ transactionName: z.string(), filters: filtersSchema }).partial())
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(offsetSchema)
      .merge(serviceTransactionDataSourceSchema),
  }),
});
