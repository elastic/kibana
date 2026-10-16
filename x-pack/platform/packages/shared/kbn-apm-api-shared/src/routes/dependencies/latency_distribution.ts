/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { OverallLatencyDistributionResponse } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, kuerySchema } from '../../default_api_types';
import { MAX_DOCUMENT_VALUE_LENGTH } from '../../constants';

export interface DependencyLatencyDistributionResponse {
  allSpansDistribution: OverallLatencyDistributionResponse;
  failedSpansDistribution: OverallLatencyDistributionResponse;
}

export const dependencyLatencyDistributionRoute =
  defineRoute<DependencyLatencyDistributionResponse>()({
    endpoint: 'GET /internal/apm/dependencies/charts/distribution',
    params: lazySchema(() =>
      z.object({
        query: z
          .object({
            dependencyName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH),
            spanName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH),
            percentileThreshold: z.coerce.number().min(0).max(100),
          })
          .merge(rangeSchema)
          .merge(kuerySchema)
          .merge(environmentSchema),
      })
    ),
  });
