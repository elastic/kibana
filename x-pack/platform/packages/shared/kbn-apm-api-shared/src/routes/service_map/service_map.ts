/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { ServiceMapResponse } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';
import {
  MAX_FIELD_VALUE_LENGTH,
  MAX_JSON_ARRAY_PARAM_LENGTH,
  MAX_KUERY_LENGTH,
} from '../../constants';

export type ServiceMapRouteResponse = ServiceMapResponse;

export const serviceMapRoute = defineRoute<ServiceMapRouteResponse>()({
  endpoint: 'GET /internal/apm/service-map',
  params: lazySchema(() =>
    z.object({
      query: z
        .object({
          serviceName: z.string().max(MAX_FIELD_VALUE_LENGTH),
          serviceGroup: z.string().max(MAX_FIELD_VALUE_LENGTH),
          kuery: z.string().max(MAX_KUERY_LENGTH),
          // JSON-serialised ES query produced by buildEsQuery() on the client.
          // Carries filter-bar pills + Controls API selections already merged.
          esQuery: z
            .string()
            .max(MAX_JSON_ARRAY_PARAM_LENGTH)
            .transform((value, ctx) => {
              try {
                return JSON.parse(value);
              } catch (err) {
                ctx.addIssue({ code: 'custom', message: err.message });
                return z.NEVER;
              }
            }),
        })
        .partial()
        .merge(environmentSchema)
        .merge(rangeSchema),
    })
  ),
});
