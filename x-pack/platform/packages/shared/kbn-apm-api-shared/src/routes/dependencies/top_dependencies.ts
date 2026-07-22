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
import { rangeSchema, kuerySchema } from '../../default_api_types';

export interface TopDependenciesResponse {
  dependencies: Array<{
    currentStats: ConnectionStats & { impact: number };
    previousStats: (ConnectionStats & { impact: number }) | null;
    location: Node;
  }>;
  sampled: boolean;
}

export const topDependenciesRoute = defineRoute<TopDependenciesResponse>()({
  endpoint: 'GET /internal/apm/dependencies/top_dependencies',
  params: z.object({
    query: rangeSchema
      .merge(environmentSchema)
      .merge(kuerySchema)
      .merge(z.object({ numBuckets: z.coerce.number() })),
  }),
});
