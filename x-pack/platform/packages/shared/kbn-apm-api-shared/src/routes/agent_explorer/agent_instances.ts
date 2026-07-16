/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, probabilitySchema } from '../../default_api_types';

export type AgentExplorerAgentInstancesResponse = Array<{
  serviceNode: string;
  environments: string[];
  agentVersion: string;
  lastReport: string;
}>;

export interface AgentExplorerAgentInstancesRouteResponse {
  items: AgentExplorerAgentInstancesResponse;
}

export const agentInstancesRoute = defineRoute<AgentExplorerAgentInstancesRouteResponse>()({
  endpoint: 'GET /internal/apm/services/{serviceName}/agent_instances',
  params: z.object({
    path: z.object({ serviceName: z.string() }),
    query: environmentSchema.merge(kuerySchema).merge(rangeSchema).merge(probabilitySchema),
  }),
});
