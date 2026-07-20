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

export type MobileFiltersResponse = Array<{
  key: MobilePropertyType;
  options: string[];
}>;

export interface MobileFiltersRouteResponse {
  mobileFilters: MobileFiltersResponse;
}

export const mobileFiltersRoute = defineRoute<MobileFiltersRouteResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/mobile/filters',
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
