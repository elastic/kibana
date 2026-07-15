/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import type { AgentName } from '@kbn/apm-types';
import { environmentSchema } from '@kbn/apm-types';
import { defineRoute } from '../types';
import { kuerySchema, rangeSchema, probabilitySchema } from '../../default_api_types';

export interface AgentExplorerAgentsResponse {
  items: Array<{
    agentDocsPageUrl: string | undefined;
    serviceName: string;
    environments: string[];
    agentName: AgentName;
    agentVersion: string[];
    agentTelemetryAutoVersion: string[];
    instances: number;
    latestVersion?: string;
  }>;
}

export const agentsPerServiceRoute = defineRoute<AgentExplorerAgentsResponse>()({
  endpoint: 'GET /internal/apm/get_agents_per_service',
  params: z.object({
    query: environmentSchema.merge(kuerySchema).merge(rangeSchema).merge(probabilitySchema).extend({
      serviceName: z.string().optional(),
      agentLanguage: z.string().optional(),
    }),
  }),
});
