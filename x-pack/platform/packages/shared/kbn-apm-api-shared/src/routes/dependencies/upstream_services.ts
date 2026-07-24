/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { ConnectionStats, Node } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, kuerySchema, offsetSchema } from '../../default_api_types';

export interface UpstreamServicesForDependencyResponse {
  services: Array<{
    location: Node;
    currentStats: ConnectionStats & { impact: number };
    previousStats: (ConnectionStats & { impact: number }) | null;
  }>;
}

export const upstreamServicesRoute = defineRoute<UpstreamServicesForDependencyResponse>()({
  endpoint: 'GET /internal/apm/dependencies/upstream_services',
  params: z.object({
    query: z
      .object({ dependencyName: z.string() })
      .merge(rangeSchema)
      .merge(z.object({ numBuckets: z.coerce.number() }))
      .merge(environmentSchema)
      .merge(offsetSchema)
      .merge(kuerySchema),
  }),
});
