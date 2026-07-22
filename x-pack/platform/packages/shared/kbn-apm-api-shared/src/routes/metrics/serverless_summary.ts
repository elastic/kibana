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

export type AwsLambdaArchitecture = 'arm' | 'x86_64';

export type AWSLambdaPriceFactor = Record<AwsLambdaArchitecture, number>;

export interface ServerlessSummaryResponse {
  memoryUsageAvgRate: number | undefined;
  serverlessFunctionsTotal: number | undefined;
  serverlessDurationAvg: number | null | undefined;
  billedDurationAvg: number | null | undefined;
  estimatedCost: number | undefined;
}

export const serverlessSummaryRoute = defineRoute<ServerlessSummaryResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/summary',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: environmentSchema
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(z.object({ serverlessId: z.string() }).partial()),
  }),
});
