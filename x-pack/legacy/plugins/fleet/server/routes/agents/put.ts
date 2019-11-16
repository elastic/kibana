/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeUpdate } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';
import { Agent } from '../../../common/types/domain_data';

export const createPUTAgentsRoute = (libs: FleetServerLib) => ({
  method: 'PUT',
  path: '/api/fleet/agents/{agentId}',
  options: {
    tags: ['access:fleet-write'],
    validate: {
      payload: Joi.object({
        user_provided_metadata: Joi.object().optional(),
      }),
    },
  },
  handler: async (
    request: FrameworkRequest<{
      params: { agentId: string };
      payload: {
        user_provided_metadata: any;
      };
    }>
  ): Promise<ReturnTypeUpdate<Agent>> => {
    const { user, params, payload } = request;
    const { agentId } = params;

    await libs.agents.update(user, agentId, payload);
    const agent = (await libs.agents.getById(user, agentId)) as Agent;

    return { item: agent, success: true, action: 'updated' };
  },
});
