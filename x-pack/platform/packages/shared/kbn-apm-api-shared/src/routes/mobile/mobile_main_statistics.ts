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

export interface MobileMainStatisticsResponse {
  mainStatistics: Array<{
    name: string | number;
    latency: number | null;
    throughput: number;
    crashRate: number;
  }>;
}

export const mobileMainStatisticsRoute = defineRoute<MobileMainStatisticsResponse>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/main_statistics',
  params: z.object({
    path: z.object({
      serviceName: z.string(),
    }),
    query: z
      .object({
        field: z.string(),
      })
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(environmentSchema),
  }),
});
