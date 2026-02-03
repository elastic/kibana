/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type {
  BulkChangeAgentsPrivilegeLevelRequestSchema,
  ChangeAgentPrivilegeLevelRequestSchema,
  FleetRequestHandler,
} from '../../types';
import { bulkChangeAgentsPrivilegeLevel, changeAgentPrivilegeLevel } from '../../services/agents';

export const changeAgentPrivilegeLevelHandler: FleetRequestHandler<
  TypeOf<typeof ChangeAgentPrivilegeLevelRequestSchema.params>,
  undefined,
  TypeOf<typeof ChangeAgentPrivilegeLevelRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const body = await changeAgentPrivilegeLevel(
    esClient,
    soClient,
    request.params.agentId,
    request.body
  );
  return response.ok({ body });
};

export const bulkChangeAgentsPrivilegeLevelHandler: FleetRequestHandler<
  undefined,
  undefined,
  TypeOf<typeof BulkChangeAgentsPrivilegeLevelRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const { agents, ...options } = request.body;
  const agentOptions = Array.isArray(agents) ? { agentIds: agents } : { kuery: agents };

  const body = await bulkChangeAgentsPrivilegeLevel(esClient, soClient, {
    ...options,
    ...agentOptions,
  });
  return response.ok({ body });
};
