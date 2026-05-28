/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { agentsPerServiceRoute } from './agents_per_service';
import { latestAgentVersionsRoute } from './latest_agent_versions';
import { agentInstancesRoute } from './agent_instances';

export const agentExplorerRouteDefinitions = {
  agentsPerService: agentsPerServiceRoute,
  latestAgentVersions: latestAgentVersionsRoute,
  agentInstances: agentInstancesRoute,
};

export type { AgentExplorerAgentsResponse } from './agents_per_service';
export type { AgentLatestVersionsResponse } from './latest_agent_versions';
export type {
  AgentExplorerAgentInstancesResponse,
  AgentExplorerAgentInstancesRouteResponse,
} from './agent_instances';
