/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { FrameworkRequest } from '../../libs/adapters/framework/adapter_types';
import { ReturnTypeList } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';

export const createListAgentsRoute = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/agents',
  config: {
    validate: {
      query: {
        page: Joi.number().default(1),
      },
    },
  },
  handler: async (
    request: FrameworkRequest<{ query: { page: string } }>
  ): Promise<ReturnTypeList<any>> => {
    const page = parseInt(request.query.page, 10);

    const { agents, total } = await libs.agents.list(request.user);

    return { list: agents, success: true, page, total };
  },
});
