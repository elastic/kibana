/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { type MobilePropertyType } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export type MobileMostUsedChartResponse = Array<{
  key: MobilePropertyType;
  options: Array<{
    key: string | number;
    docCount: number;
  }>;
}>;

export interface MobileMostUsedChartsRouteResponse {
  mostUsedCharts: Array<{
    key: MobilePropertyType;
    options: MobileMostUsedChartResponse[number]['options'];
  }>;
}

export const mobileMostUsedChartsRoute = defineRoute<MobileMostUsedChartsRouteResponse>()({
  endpoint: 'GET /internal/apm/mobile-services/{serviceName}/most_used_charts',
  params: z.object({
    path: z.object({
      serviceName: z.string(),
    }),
    query: z
      .object({
        transactionType: z.string().optional(),
      })
      .merge(kuerySchema)
      .merge(rangeSchema)
      .merge(environmentSchema),
  }),
});
