/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TypeOf } from '@kbn/config-schema';

import type { ChangeAgentPrivilegeLevelRequestSchema, FleetRequestHandler } from '../../types';
import { changeAgentPrivilegeLevel } from '../../services/agents';

export const changeAgentPrivilegeLevelHandler: FleetRequestHandler<
  TypeOf<typeof ChangeAgentPrivilegeLevelRequestSchema.params>,
  undefined,
  TypeOf<typeof ChangeAgentPrivilegeLevelRequestSchema.body>
> = async (context, request, response) => {
  const [coreContext] = await Promise.all([context.core, context.fleet]);
  const esClient = coreContext.elasticsearch.client.asInternalUser;
  const soClient = coreContext.savedObjects.client;
  const options = request.body?.user_info ? { userInfo: request.body.user_info } : {};

  const body = await changeAgentPrivilegeLevel(esClient, soClient, request.params.agentId, options);
  return response.ok({ body });
};
