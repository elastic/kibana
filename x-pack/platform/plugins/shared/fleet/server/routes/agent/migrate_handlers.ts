/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { FleetRequestHandler, MigrateSingleAgentRequestSchema } from '../../types';
import * as AgentService from '../../services/agents';

export const migrateSingleAgentHandler: FleetRequestHandler<
  TypeOf<typeof MigrateSingleAgentRequestSchema.params>,
  undefined,
  TypeOf<typeof MigrateSingleAgentRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const options = request.body;
  // First validate the agent exists
  const agent = await AgentService.getAgentById(esClient, soClient, request.params.agentId);
  // Using the agent id, get the agent policy
  const agentPolicy = await AgentService.getAgentPolicyForAgent(
    soClient,
    esClient,
    request.params.agentId
  );

  const body = await AgentService.migrateSingleAgent(
    esClient,
    request.params.agentId,
    agentPolicy,
    agent,
    {
      ...options,
      policyId: agentPolicy?.id,
    }
  );
  return response.ok({ body });
};
