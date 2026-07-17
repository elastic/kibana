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
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';

export interface CrashDistributionResponse {
  currentPeriod: Array<{ x: number; y: number }>;
  previousPeriod: Coordinate[];
  bucketSize: number;
}

export const crashDistributionRoute = defineRoute<CrashDistributionResponse>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/crashes/distribution',
  params: z.object({
    path: z.object({
      serviceName: z.string(),
    }),
    query: z
      .object({
        groupId: z.string().optional(),
      })
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(offsetSchema),
  }),
});
