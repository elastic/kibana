/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export interface ObservabilityOverviewResponse {
  serviceCount: number;
  transactionPerMinute: {
    value: number | undefined;
    timeseries: Array<{ x: number; y: number | null }>;
  };
}

export const observabilityOverviewRoute = defineRoute<ObservabilityOverviewResponse>()({
  endpoint: 'GET /internal/apm/observability_overview',
  params: z.object({
    query: rangeSchema.extend({
      bucketSize: z.coerce.number(),
      intervalString: z.string(),
    }),
  }),
});
