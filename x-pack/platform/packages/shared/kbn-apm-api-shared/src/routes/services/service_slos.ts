/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import {
  MAX_ARRAY_ITEMS,
  MAX_FIELD_VALUE_LENGTH,
  MAX_JSON_ARRAY_PARAM_LENGTH,
  MAX_KUERY_LENGTH,
  MAX_PAGE_SIZE,
} from '../../constants';

export interface StatusCounts {
  violated: number;
  degrading: number;
  healthy: number;
  noData: number;
}

export interface ServiceSlosResponse {
  results: SLOWithSummaryResponse[];
  total: number;
  page: number;
  perPage: number;
  activeAlerts: Record<string, number>;
  statusCounts: StatusCounts;
}

// Equivalent of io-ts's jsonRt.pipe(t.array(t.string)): parse a JSON string,
// then validate the parsed value is an array of strings.
const statusFiltersJsonSchema = z
  .string()
  .max(MAX_JSON_ARRAY_PARAM_LENGTH)
  .transform((value, ctx) => {
    try {
      return JSON.parse(value);
    } catch (err) {
      ctx.addIssue({ code: 'custom', message: err.message });
      return z.NEVER;
    }
  })
  .pipe(z.array(z.string().max(MAX_FIELD_VALUE_LENGTH)).max(MAX_ARRAY_ITEMS));

export const serviceSlosRoute = defineRoute<ServiceSlosResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/slos',
  params: lazySchema(() =>
    z.object({
      path: z.object({ serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH) }),
      query: environmentSchema
        .merge(
          z.object({
            page: z.coerce.number().int().min(0).max(100_000),
            perPage: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE),
          })
        )
        .merge(
          z
            .object({
              statusFilters: statusFiltersJsonSchema,
              kqlQuery: z.string().max(MAX_KUERY_LENGTH),
            })
            .partial()
        ),
    })
  ),
});
