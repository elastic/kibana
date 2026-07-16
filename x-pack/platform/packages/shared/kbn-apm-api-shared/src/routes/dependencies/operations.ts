/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, kuerySchema, offsetSchema } from '../../default_api_types';

export interface DependencyOperation {
  spanName: string;
  latency: number | null;
  throughput: number;
  failureRate: number | null;
  impact: number;
  timeseries: Record<
    'latency' | 'throughput' | 'failureRate',
    Array<{ x: number; y: number | null }>
  >;
}

export interface DependencyOperationsResponse {
  operations: DependencyOperation[];
}

export const dependencyOperationsRoute = defineRoute<DependencyOperationsResponse>()({
  endpoint: 'GET /internal/apm/dependencies/operations',
  params: z.object({
    query: rangeSchema
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(offsetSchema)
      .merge(
        z.object({
          dependencyName: z.string(),
          searchServiceDestinationMetrics: BooleanFromString.default(false),
        })
      ),
  }),
});
