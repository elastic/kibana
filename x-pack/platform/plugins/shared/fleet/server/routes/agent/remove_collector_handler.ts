/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RequestHandler } from '@kbn/core/server';
import type { TypeOf } from '@kbn/config-schema';

import type {
  PostBulkRemoveCollectorsResponse,
  PostRemoveCollectorResponse,
} from '../../../common/types';
import type {
  PostBulkRemoveCollectorsRequestSchema,
  PostRemoveCollectorRequestSchema,
} from '../../types';
import * as AgentService from '../../services/agents';

export const postRemoveCollectorHandler: RequestHandler<
  TypeOf<typeof PostRemoveCollectorRequestSchema.params>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  await AgentService.removeCollector(esClient, soClient, request.params.agentId);

  const body: PostRemoveCollectorResponse = {};
  return response.ok({ body });
};

export const postBulkRemoveCollectorsHandler: RequestHandler<
  undefined,
  undefined,
  TypeOf<typeof PostBulkRemoveCollectorsRequestSchema.body>
> = async (context, request, response) => {
  const coreContext = await context.core;
  const soClient = coreContext.savedObjects.client;
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const agentOptions = Array.isArray(request.body.agents)
    ? { agentIds: request.body.agents }
    : { kuery: request.body.agents };

  const results = await AgentService.removeCollectors(esClient, soClient, {
    ...agentOptions,
    showInactive: request.body.includeInactive,
    dryRun: request.body.dryRun,
  });

  if (request.body.dryRun) {
    return response.ok({ body: { count: (results as { count: number }).count } });
  }
  const body: PostBulkRemoveCollectorsResponse = {
    actionId: (results as { actionId: string }).actionId,
  };
  return response.ok({ body });
};
