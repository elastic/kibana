/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z, lazySchema } from '@kbn/zod/v4';
import type { ConnectionStats, Node } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, kuerySchema, offsetSchema } from '../../default_api_types';
import { MAX_DOCUMENT_VALUE_LENGTH, MAX_NUM_BUCKETS } from '../../constants';

export interface UpstreamServicesForDependencyResponse {
  services: Array<{
    location: Node;
    currentStats: ConnectionStats & { impact: number };
    previousStats: (ConnectionStats & { impact: number }) | null;
  }>;
}

export const upstreamServicesRoute = defineRoute<UpstreamServicesForDependencyResponse>()({
  endpoint: 'GET /internal/apm/dependencies/upstream_services',
  params: lazySchema(() =>
    z.object({
      query: z
        .object({ dependencyName: z.string().max(MAX_DOCUMENT_VALUE_LENGTH) })
        .merge(rangeSchema)
        .merge(z.object({ numBuckets: z.coerce.number().int().min(1).max(MAX_NUM_BUCKETS) }))
        .merge(environmentSchema)
        .merge(offsetSchema)
        .merge(kuerySchema),
    })
  ),
});
