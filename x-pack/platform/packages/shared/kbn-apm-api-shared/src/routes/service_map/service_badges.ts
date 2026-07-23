/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { SloStatus } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import type { ServiceAlertsResponse } from '../services/service_alerts_count';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export type ServiceSloStatsResponse = Array<{
  serviceName: string;
  sloStatus: SloStatus;
  sloCount: number;
}>;

export interface ServiceMapServiceBadgesResponse {
  alerts: ServiceAlertsResponse;
  slos: ServiceSloStatsResponse;
}

export const serviceMapServiceBadgesRoute = defineRoute<ServiceMapServiceBadgesResponse>()({
  endpoint: 'POST /internal/apm/service-map/service_badges',
  params: z.object({
    query: environmentSchema.merge(rangeSchema).merge(z.object({ kuery: z.string() }).partial()),
    body: z.object({
      serviceNames: z
        .string()
        .transform((value, ctx) => {
          try {
            return JSON.parse(value);
          } catch (err) {
            ctx.addIssue({ code: 'custom', message: err.message });
            return z.NEVER;
          }
        })
        .pipe(z.array(z.string())),
    }),
  }),
});
