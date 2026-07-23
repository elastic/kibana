/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import { dependencyChartQuerySchema } from './types';

export interface DependencyErrorRateChartsResponse {
  currentTimeseries: Array<{ x: number; y: number }>;
  comparisonTimeseries: Array<{ x: number; y: number }> | null;
}

export const dependencyErrorRateChartsRoute = defineRoute<DependencyErrorRateChartsResponse>()({
  endpoint: 'GET /internal/apm/dependencies/charts/error_rate',
  params: z.object({ query: dependencyChartQuerySchema }),
});
