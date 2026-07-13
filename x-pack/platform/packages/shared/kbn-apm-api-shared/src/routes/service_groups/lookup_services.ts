/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { AgentName } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { rangeSchema, kuerySchema } from '../../default_api_types';

export type LookupServicesResponse = Array<{
  serviceName: string;
  environments: string[];
  agentName: AgentName;
}>;

export interface LookupServicesRouteResponse {
  items: LookupServicesResponse;
}

export const serviceGroupServicesRoute = defineRoute<LookupServicesRouteResponse>()({
  endpoint: 'GET /internal/apm/service-group/services',
  params: z.object({
    query: rangeSchema.merge(kuerySchema.partial()),
  }),
});
