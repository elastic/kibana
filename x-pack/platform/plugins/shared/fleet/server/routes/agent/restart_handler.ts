/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { PostAgentRestartResponse } from '../../../common/types';
import type {
  FleetRequestHandler,
  PostAgentRestartRequestSchema,
  PostBulkAgentRestartRequestSchema,
} from '../../types';
import * as AgentService from '../../services/agents';

export const restartAgentHandler: FleetRequestHandler<
  TypeOf<typeof PostAgentRestartRequestSchema.params>,
  undefined,
  undefined
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  const result = await AgentService.restartAgent(esClient, soClient, request.params.agentId);
  const body: PostAgentRestartResponse = { actionId: result.actionId };
  return response.ok({ body });
};

export const bulkRestartAgentsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkAgentRestartRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const { agents, batchSize, includeInactive } = request.body;
  const agentOptions = Array.isArray(agents)
    ? { agentIds: agents }
    : { kuery: agents, showInactive: includeInactive };

  const result = await AgentService.bulkRestartAgents(esClient, soClient, {
    ...agentOptions,
    batchSize,
    includeInactive,
  });
  return response.ok({ body: { actionId: result.actionId } });
};
