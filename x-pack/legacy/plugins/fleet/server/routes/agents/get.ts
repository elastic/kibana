/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeGet } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';
import { Agent } from '../../../common/types/domain_data';

export const createGETAgentsRoute = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/agents/{agentId}',
  options: {
    tags: ['access:fleet-read'],
    validate: {},
  },
  handler: async (
    request: FrameworkRequest<{ params: { agentId: string } }>
  ): Promise<ReturnTypeGet<Agent>> => {
    const agent = await libs.agents.getById(request.user, request.params.agentId);
    if (!agent) {
      throw Boom.notFound('Agent not found');
    }

    return { item: agent, success: true };
  },
});
