/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { type MobilePropertyType, MobileErrorType } from '@kbn/apm-types';
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
  params: lazySchema(() =>
    z.object({
      path: z.object({
        serviceName: z.string(),
      }),
      query: z
        .object({
          transactionType: z.string().optional(),
          // Scopes the filter dropdown options to the documents the caller lists:
          // `crash` for the crashes tab, `error` for the errors tab (error documents
          // that are not crashes). Omitted on the overview and transactions screens,
          // where transaction and span documents are the right source.
          errorType: z.enum([MobileErrorType.Crash, MobileErrorType.Error]).optional(),
        })
        .merge(kuerySchema)
        .merge(rangeSchema)
        .merge(environmentSchema),
    })
  ),
});
