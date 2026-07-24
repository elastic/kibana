/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema } from '../../default_api_types';

export interface InfrastructureAttributesResponse {
  containerIds: string[];
  hostNames: string[];
  podNames: string[];
}

export const infrastructureAttributesRoute = defineRoute<InfrastructureAttributesResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/infrastructure_attributes',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: kuerySchema
      .merge(rangeSchema)
      .merge(environmentSchema)
      .extend({ agentName: z.string().optional() }),
  }),
});
