/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { Coordinate, YUnit, ChartType } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface FetchAndTransformMetrics {
  title: string;
  key: string;
  yUnit: YUnit;
  series: Array<{
    title: string;
    key: string;
    type: ChartType;
    overallValue: number;
    data: Coordinate[];
  }>;
  description?: string;
}

export type GenericMetricsChart = FetchAndTransformMetrics;

export interface MetricsChartsResponse {
  charts: FetchAndTransformMetrics[];
}

export const metricsChartsRoute = defineRoute<MetricsChartsResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/metrics/charts',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: z
      .object({ agentName: z.string() })
      .merge(z.object({ serviceNodeName: z.string() }).partial())
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema),
  }),
});
