/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type { PostAgentRollbackResponse } from '../../../common/types';
import type {
  PostAgentRollbackRequestSchema,
  PostBulkAgentRollbackRequestSchema,
} from '../../types';
import { getAgentById } from '../../services/agents';
import * as AgentService from '../../services/agents';

export const rollbackAgentHandler: RequestHandler<
  TypeOf<typeof PostAgentRollbackRequestSchema.params>,
  undefined,
  undefined
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const agent = await getAgentById(esClient, soClient, request.params.agentId);

  const actionId = await AgentService.sendRollbackAgentAction(soClient, esClient, agent);

  const body: PostAgentRollbackResponse = {
    actionId,
  };
  return response.ok({ body });
};

export const bulkRollbackAgentHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkAgentRollbackRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const { agents, batchSize, includeInactive } = request.body;
  const agentOptions = Array.isArray(agents)
    ? { agentIds: agents }
    : { kuery: agents, showInactive: includeInactive };
  const results = await AgentService.sendRollbackAgentsActions(soClient, esClient, {
    ...agentOptions,
    batchSize,
    includeInactive,
  });

  return response.ok({ body: { actionIds: results.actionIds } });
};
