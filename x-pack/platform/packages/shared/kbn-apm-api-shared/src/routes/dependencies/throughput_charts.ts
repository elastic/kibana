/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import { dependencyChartQuerySchema } from './types';

export interface ThroughputChartsForDependencyResponse {
  currentTimeseries: Array<{ x: number; y: number | null }>;
  comparisonTimeseries: Array<{ x: number; y: number | null }> | null;
}

export const dependencyThroughputChartsRoute = defineRoute<ThroughputChartsForDependencyResponse>()(
  {
    endpoint: 'GET /internal/apm/dependencies/charts/throughput',
    params: z.object({ query: dependencyChartQuerySchema }),
  }
);
