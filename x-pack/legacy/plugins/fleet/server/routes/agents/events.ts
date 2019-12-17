/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeList } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';
import { AgentEvent } from '../../../common/types/domain_data';

export const createGETAgentEventsRoute = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/agents/{agentId}/events',
  options: {
    tags: ['access:fleet-read'],
    validate: {
      query: Joi.object({
        kuery: Joi.string()
          .trim()
          .optional(),
        page: Joi.number()
          .optional()
          .min(1)
          .default(1),
        perPage: Joi.number()
          .optional()
          .min(1)
          .default(20),
      }),
    },
  },
  handler: async (
    request: FrameworkRequest<{
      params: { agentId: string };
      query: { page: string; perPage: string; kuery: string };
    }>
  ): Promise<ReturnTypeList<AgentEvent>> => {
    const page = parseInt(request.query.page, 10);
    const perPage = parseInt(request.query.perPage, 10);

    const { items, total } = await libs.agentEvents.getEventsById(
      request.user,
      request.params.agentId,
      request.query.kuery,
      page,
      perPage
    );

    return { list: items, total, success: true, page, perPage };
  },
});
