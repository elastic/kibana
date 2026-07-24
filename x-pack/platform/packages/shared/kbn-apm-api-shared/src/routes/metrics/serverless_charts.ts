/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import type { FetchAndTransformMetrics } from './metrics_charts';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, transactionDataSourceSchema } from '../../default_api_types';

export interface ServerlessMetricsChartsResponse {
  charts: FetchAndTransformMetrics[];
}

export const serverlessMetricsChartsRoute = defineRoute<ServerlessMetricsChartsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/charts',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: environmentSchema
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(z.object({ serverlessId: z.string() }).partial())
      .merge(transactionDataSourceSchema)
      .merge(z.object({ bucketSizeInSeconds: z.coerce.number() })),
  }),
});
