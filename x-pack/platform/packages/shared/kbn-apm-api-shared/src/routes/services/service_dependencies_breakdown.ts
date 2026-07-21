/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, kuerySchema } from '../../default_api_types';

export type ServiceDependenciesBreakdownResponse = Array<{
  title: string;
  data: Array<{ x: number; y: number }>;
}>;

export interface ServiceDependenciesBreakdownRouteResponse {
  breakdown: ServiceDependenciesBreakdownResponse;
}

export const serviceDependenciesBreakdownRoute =
  defineRoute<ServiceDependenciesBreakdownRouteResponse>()({
    endpoint: 'GET /internal/apm/services/{serviceName}/dependencies/breakdown',
    params: z.object({
      path: z.object({ serviceName: z.string() }),
      query: environmentSchema.merge(rangeSchema).merge(kuerySchema),
    }),
  });
