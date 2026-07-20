/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { indexLifecyclePhaseSchema, environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, probabilitySchema } from '../../default_api_types';

export type SizeTimeseriesResponse = Array<{
  serviceName: string;
  timeseries: Array<{ x: number; y: number }>;
}>;

export interface StorageChartRouteResponse {
  storageTimeSeries: SizeTimeseriesResponse;
}

export const storageChartRoute = defineRoute<StorageChartRouteResponse>()({
  endpoint: 'GET /internal/apm/storage_chart',
  params: z.object({
    query: indexLifecyclePhaseSchema
      .merge(probabilitySchema)
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(rangeSchema),
  }),
});
