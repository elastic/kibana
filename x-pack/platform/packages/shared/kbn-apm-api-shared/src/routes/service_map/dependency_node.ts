/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { NodeStats } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, offsetSchema } from '../../default_api_types';

export interface ServiceMapServiceDependencyInfoResponse {
  currentPeriod: NodeStats;
  previousPeriod: NodeStats | undefined;
}

export const serviceMapDependencyNodeRoute = defineRoute<ServiceMapServiceDependencyInfoResponse>()(
  {
    endpoint: 'GET /internal/apm/service-map/dependency',
    params: z.object({
      query: z
        .object({
          dependencies: z.union([z.string(), z.array(z.string())]),
        })
        .merge(z.object({ sourceServiceName: z.string() }).partial())
        .merge(environmentSchema)
        .merge(rangeSchema)
        .merge(offsetSchema),
    }),
  }
);
