/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { instancesSortFieldSchema, latencyAggregationTypeSchema } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';

export type ServiceInstanceMainStatisticsResponse = Array<{
  serviceNodeName: string;
  errorRate?: number;
  latency?: number;
  throughput?: number;
  cpuUsage?: number | null;
  memoryUsage?: number | null;
}>;

export interface ServiceInstancesMainStatisticsRouteResponse {
  currentPeriod: ServiceInstanceMainStatisticsResponse;
  previousPeriod: ServiceInstanceMainStatisticsResponse;
}

export const serviceInstancesMainStatisticsRoute =
  defineRoute<ServiceInstancesMainStatisticsRouteResponse>()({
    endpoint: 'GET /internal/apm/services/{serviceName}/service_overview_instances/main_statistics',
    params: z.object({
      path: z.object({ serviceName: z.string() }),
      query: z
        .object({
          latencyAggregationType: latencyAggregationTypeSchema,
          transactionType: z.string(),
          sortField: instancesSortFieldSchema,
          sortDirection: z.union([z.literal('asc'), z.literal('desc')]),
        })
        .merge(offsetSchema)
        .merge(environmentSchema)
        .merge(kuerySchema)
        .merge(rangeSchema),
    }),
  });
