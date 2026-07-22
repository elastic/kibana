/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { latencyAggregationTypeSchema, type Coordinate } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  kuerySchema,
  rangeSchema,
  offsetSchema,
  filtersSchema,
  serviceTransactionDataSourceSchema,
} from '../../default_api_types';

export interface TransactionLatencyResponse {
  currentPeriod: {
    overallAvgDuration: number | null;
    latencyTimeseries: Coordinate[];
  };
  previousPeriod: {
    overallAvgDuration: number | null;
    latencyTimeseries: Coordinate[];
  };
}

export const transactionLatencyChartsRoute = defineRoute<TransactionLatencyResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/transactions/charts/latency',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: z
      .object({
        latencyAggregationType: latencyAggregationTypeSchema,
        bucketSizeInSeconds: z.coerce.number(),
        useDurationSummary: BooleanFromString.default(false),
      })
      .merge(
        z
          .object({
            transactionType: z.string(),
            transactionName: z.string(),
            filters: filtersSchema,
          })
          .partial()
      )
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(offsetSchema)
      .merge(serviceTransactionDataSourceSchema),
  }),
});
