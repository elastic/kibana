/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { Coordinate } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface ActiveInstanceTimeseries {
  serverlessDuration: Coordinate[];
  billedDuration: Coordinate[];
}

export interface ActiveInstanceOverview {
  activeInstanceName: string;
  serverlessId: string;
  serverlessFunctionName: string;
  timeseries: ActiveInstanceTimeseries;
  serverlessDurationAvg: number | null;
  billedDurationAvg: number | null;
  avgMemoryUsed?: number | null;
  memorySize: number | null;
}

export interface ServerlessActiveInstancesResponse {
  activeInstances: ActiveInstanceOverview[];
  timeseries: Coordinate[];
}

export const serverlessActiveInstancesRoute = defineRoute<ServerlessActiveInstancesResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/serverless/active_instances',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: environmentSchema
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(z.object({ serverlessId: z.string() }).partial()),
  }),
});
