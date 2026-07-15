/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema } from '../../default_api_types';

export type ServiceAlertsResponse = Array<{
  serviceName: string;
  alertsCount: number;
}>;

export type ServiceAlertsCountRouteResponse = ServiceAlertsResponse[number];

export const serviceAlertsCountRoute = defineRoute<ServiceAlertsCountRouteResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/alerts_count',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: rangeSchema.merge(environmentSchema),
  }),
});
