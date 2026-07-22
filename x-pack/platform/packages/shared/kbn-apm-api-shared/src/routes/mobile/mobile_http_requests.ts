/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { type Coordinate } from '@kbn/apm-types';

import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, offsetSchema } from '../../default_api_types';

export interface HttpRequestsTimeseries {
  currentPeriod: { timeseries: Coordinate[]; value: number | null | undefined };
  previousPeriod: { timeseries: Coordinate[]; value: number | null | undefined };
}

export const mobileHttpRequestsRoute = defineRoute<HttpRequestsTimeseries>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/transactions/charts/http_requests',
  params: z.object({
    path: z.object({
      serviceName: z.string(),
    }),
    query: z
      .object({
        transactionType: z.string().optional(),
        transactionName: z.string().optional(),
      })
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(environmentSchema)
      .merge(offsetSchema),
  }),
});
