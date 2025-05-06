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
  const [coreContext, fleetContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const options = request.body;
  try {
    // first validate the agent exists
    const agent = await AgentService.getAgentById(esClient, soClient, request.params.agentId);

    // using the agent id, get the agent policy
    const agentPolicy = await AgentService.getAgentPolicyForAgent(
      soClient,
      esClient,
      request.params.agentId
    );
    //  If the agent belongs to a policy that is protected or has fleet-server as a component meaning its a fleet server agent, throw an error
    if (agentPolicy?.is_protected || agent.components?.some((c) => c.type === 'fleet-server')) {
      throw new Error(`Agent is protected and cannot be migrated`);
    }

    const body = await AgentService.migrateSingleAgent(esClient, request.params.agentId, options);
    return response.ok({ body });
  } catch (error) {
    if (error.isBoom && error.output.statusCode === 404) {
      return response.notFound({
        body: { message: error.message },
      });
    }

    throw error;
  }
};
