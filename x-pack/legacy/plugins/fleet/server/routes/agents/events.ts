/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeList } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';

export const createGETAgentEventsRoute = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/agents/{agentId}/events',
  config: {
    validate: {
      query: Joi.object({
        page: Joi.number()
          .optional()
          .min(1)
          .default(1),
        per_page: Joi.number()
          .optional()
          .min(1)
          .default(25),
      }),
    },
  },
  handler: async (
    request: FrameworkRequest<{
      params: { agentId: string };
      query: { page: string; per_page: string };
    }>
  ): Promise<ReturnTypeList<any>> => {
    const page = parseInt(request.query.page, 10);
    const perPage = parseInt(request.query.per_page, 10);

    const { items, total } = await libs.agents.getEventsById(
      request.user,
      request.params.agentId,
      page,
      perPage
    );

    return { list: items, total, success: true, page };
  },
});
