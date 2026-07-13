/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { SLOWithSummaryResponse } from '@kbn/slo-schema';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';

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
  .transform((value, ctx) => {
    try {
      return JSON.parse(value);
    } catch (err) {
      ctx.addIssue({ code: 'custom', message: err.message });
      return z.NEVER;
    }
  })
  .pipe(z.array(z.string()));

export const serviceSlosRoute = defineRoute<ServiceSlosResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/slos',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: environmentSchema
      .merge(
        z.object({
          page: z.coerce.number(),
          perPage: z.coerce.number(),
        })
      )
      .merge(
        z
          .object({
            statusFilters: statusFiltersJsonSchema,
            kqlQuery: z.string(),
          })
          .partial()
      ),
  }),
});
