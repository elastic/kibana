/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { z } from '@kbn/zod/v4';
import { defineRoute } from '../types';

export interface AgentConfigurationAgentNameResponse {
  agentName: string | undefined;
}

export const agentConfigurationAgentNameRoute = defineRoute<AgentConfigurationAgentNameResponse>()({
  endpoint: 'GET /api/apm/settings/agent-configuration/agent_name 2023-10-31',
  params: z.object({
    query: z.object({ serviceName: z.string() }),
  }),
});
