/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import type { ElasticsearchClient } from '@kbn/core/server';

import { FleetUnauthorizedError } from '../../errors';

import type { AgentPolicy, Agent } from '../../types';

import { createAgentAction } from './actions';

export async function migrateSingleAgent(
  esClient: ElasticsearchClient,
  agentId: string,
  agentPolicy: AgentPolicy | undefined,
  agent: Agent,
  options: any
) {
  //  If the agent belongs to a policy that is protected or has fleet-server as a component meaning its a fleet server agent, throw an error
  if (agentPolicy?.is_protected || agent.components?.some((c) => c.type === 'fleet-server')) {
    throw new FleetUnauthorizedError(`Agent is protected and cannot be migrated`);
  }
  const response = await createAgentAction(esClient, {
    agents: [agentId],
    created_at: new Date().toISOString(),
    type: 'MIGRATE',
    policyId: options.policyId,
    data: {
      enrollment_token: options.enrollment_token,
      target_uri: options.uri,
      settings: options.settings,
    },
  });
  return { actionId: response.id };
}

export async function bulkMigrateAgents(
  esClient: ElasticsearchClient,
  agents: Agent[],
  agentPolicies: Array<AgentPolicy | undefined>,
  options: any
) {
  // If any agent is protected or has fleet-server as a component, throw an error
  const protectedAgents = agentPolicies.filter((agentPolicy) => agentPolicy?.is_protected);
  const fleetServerAgents = agents.filter((agent) =>
    agent.components?.some((c) => c.type === 'fleet-server')
  );

  if (protectedAgents.length > 0 || fleetServerAgents.length > 0) {
    throw new FleetUnauthorizedError(
      `One or more agents are ${
        protectedAgents.length > 0 && fleetServerAgents.length > 0
          ? 'protected and fleet-server'
          : protectedAgents.length > 0
          ? 'protected'
          : 'fleet-server'
      } agents and cannot be migrated`
    );
  }

  const response = await createAgentAction(esClient, {
    agents: agents.map((agent) => agent.id),
    created_at: new Date().toISOString(),
    type: 'MIGRATE',
    data: {
      enrollment_token: options.enrollment_token,
      target_uri: options.uri,
      settings: options.settings,
    },
  });
  return { actionId: response.id };
}
