/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { PostAgentUninstallResponse } from '../../../common/types';
import type {
  FleetRequestHandler,
  PostAgentUninstallRequestSchema,
  PostBulkAgentUninstallRequestSchema,
} from '../../types';
import * as AgentService from '../../services/agents';

export const uninstallAgentHandler: FleetRequestHandler<
  TypeOf<typeof PostAgentUninstallRequestSchema.params>,
  undefined,
  TypeOf<typeof PostAgentUninstallRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;

  const result = await AgentService.uninstallAgent(esClient, soClient, request.params.agentId, {
    delaySeconds: request.body?.delay_seconds,
  });
  const body: PostAgentUninstallResponse = { actionId: result.actionId };
  return response.ok({ body });
};

export const bulkUninstallAgentsHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkAgentUninstallRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const { agents, delay_seconds: delaySeconds, batchSize, includeInactive } = request.body;
  const agentOptions = Array.isArray(agents)
    ? { agentIds: agents }
    : { kuery: agents, showInactive: includeInactive };

  const result = await AgentService.bulkUninstallAgents(esClient, soClient, {
    ...agentOptions,
    delaySeconds,
    batchSize,
    includeInactive,
  });
  return response.ok({ body: { actionId: result.actionId } });
};
