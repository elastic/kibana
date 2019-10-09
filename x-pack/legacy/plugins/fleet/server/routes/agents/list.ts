/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as Joi from 'joi';
import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeList } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';
import { Agent } from '../../../common/types/domain_data';
import { DEFAULT_AGENTS_PAGE_SIZE } from '../../../common/constants';

export const createListAgentsRoute = (libs: FleetServerLib) => ({
  method: 'GET',
  path: '/api/fleet/agents',
  config: {
    validate: {
      query: {
        page: Joi.number().default(1),
        perPage: Joi.number().default(DEFAULT_AGENTS_PAGE_SIZE),
        kuery: Joi.string()
          .trim()
          .optional(),
      },
    },
  },
  handler: async (
    request: FrameworkRequest<{ query: { page: string; perPage: string; kuery: string } }>
  ): Promise<ReturnTypeList<Agent>> => {
    const { agents, total, page, perPage } = await libs.agents.list(
      request.user,
      undefined,
      parseInt(request.query.page, 10),
      parseInt(request.query.perPage, 10),
      request.query.kuery
    );

    return { list: agents, success: true, total, page, perPage };
  },
});
