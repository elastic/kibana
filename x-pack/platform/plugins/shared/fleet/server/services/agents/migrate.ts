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
