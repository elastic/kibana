/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import { BooleanFromString } from '@kbn/zod-helpers/v4';
import type { ServiceMapResponse } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, serviceTransactionDataSourceSchema } from '../../default_api_types';

export type ServiceMapRouteResponse = ServiceMapResponse;

export const serviceMapRoute = defineRoute<ServiceMapRouteResponse>()({
  endpoint: 'GET /internal/apm/service-map',
  params: lazySchema(() =>
    z.object({
      query: z
        .object({
          serviceName: z.string(),
          serviceGroup: z.string(),
          kuery: z.string(),
          // JSON-serialised ES query produced by buildEsQuery() on the client.
          // Carries filter-bar pills + Controls API selections already merged.
          esQuery: z.string().transform((value, ctx) => {
            try {
              return JSON.parse(value);
            } catch (err) {
              ctx.addIssue({ code: 'custom', message: err.message });
              return z.NEVER;
            }
          }),
          // The data source (`documentType`, `rollupInterval` and `useDurationSummary`) is optional only
          // while service map grouping (`apm.serviceMapGroupingEnabled`) is rolled out: the server
          // requires it when the flag is on and ignores it when it's off. Once the flag is removed
          // (https://github.com/elastic/kibana/issues/300607), make it required, as in `GET /internal/apm/services`.
          useDurationSummary: BooleanFromString,
        })
        .merge(serviceTransactionDataSourceSchema)
        .partial()
        .merge(environmentSchema)
        .merge(rangeSchema),
    })
  ),
});
