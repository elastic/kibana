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
  options: {
    tags: ['access:fleet-read'],
    validate: {
      query: {
        page: Joi.number().default(1),
        perPage: Joi.number().default(DEFAULT_AGENTS_PAGE_SIZE),
        showInactive: Joi.boolean().default(false),
        kuery: Joi.string()
          .trim()
          .optional(),
      },
    },
  },
  handler: async (
    request: FrameworkRequest<{
      query: { page: string; perPage: string; kuery: string; showInactive: string };
    }>
  ): Promise<ReturnTypeList<Agent>> => {
    const { agents, total, page, perPage } = await libs.agents.list(request.user, {
      page: parseInt(request.query.page, 10),
      perPage: parseInt(request.query.perPage, 10),
      kuery: request.query.kuery,
      showInactive: Boolean(request.query.showInactive),
    });

    return { list: agents, success: true, total, page, perPage };
  },
});
