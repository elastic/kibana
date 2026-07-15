/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { OverallLatencyDistributionResponse } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, kuerySchema } from '../../default_api_types';

export interface DependencyLatencyDistributionResponse {
  allSpansDistribution: OverallLatencyDistributionResponse;
  failedSpansDistribution: OverallLatencyDistributionResponse;
}

export const dependencyLatencyDistributionRoute =
  defineRoute<DependencyLatencyDistributionResponse>()({
    endpoint: 'GET /internal/apm/dependencies/charts/distribution',
    params: z.object({
      query: z
        .object({
          dependencyName: z.string(),
          spanName: z.string(),
          percentileThreshold: z.coerce.number(),
        })
        .merge(rangeSchema)
        .merge(kuerySchema)
        .merge(environmentSchema),
    }),
  });
