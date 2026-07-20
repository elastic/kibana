/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { ConnectionStatsItemWithImpact } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, offsetSchema } from '../../default_api_types';

export type ServiceDependenciesResponse = Array<
  Omit<ConnectionStatsItemWithImpact, 'stats'> & {
    currentStats: ConnectionStatsItemWithImpact['stats'];
    previousStats: ConnectionStatsItemWithImpact['stats'] | null;
  }
>;

export interface ServiceDependenciesRouteResponse {
  serviceDependencies: ServiceDependenciesResponse;
}

export const serviceDependenciesRoute = defineRoute<ServiceDependenciesRouteResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/dependencies',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: z
      .object({ numBuckets: z.coerce.number() })
      .merge(environmentSchema)
      .merge(rangeSchema)
      .merge(offsetSchema),
  }),
});
