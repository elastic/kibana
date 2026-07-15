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

export type ServerlessFunctionsOverviewResponse = Array<{
  serverlessId: string;
  serverlessFunctionName: string;
  serverlessDurationAvg: number | null;
  billedDurationAvg: number | null;
  coldStartCount: number | null;
  avgMemoryUsed: number | undefined;
  memorySize: number | null;
}>;

export interface ServerlessFunctionsOverviewRouteResponse {
  serverlessFunctionsOverview: ServerlessFunctionsOverviewResponse;
}

export const serverlessFunctionsOverviewRoute =
  defineRoute<ServerlessFunctionsOverviewRouteResponse>()({
    endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/functions_overview',
    params: z.object({
      path: z.object({ serviceName: z.string() }),
      query: environmentSchema.merge(kuerySchema).merge(rangeSchema),
    }),
  });
