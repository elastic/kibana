/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import * as t from 'io-ts';
import { defineRoute } from '../types';
import { dependencyChartQueryRt } from './types';

export interface LatencyChartsDependencyResponse {
  currentTimeseries: Array<{ x: number; y: number }>;
  comparisonTimeseries: Array<{ x: number; y: number }> | null;
}

export const dependencyLatencyChartsRoute = defineRoute<LatencyChartsDependencyResponse>()({
  endpoint: 'GET /internal/apm/dependencies/charts/latency',
  params: t.type({ query: dependencyChartQueryRt }),
});
