/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Boom from 'boom';
import * as Joi from 'joi';
import { FrameworkRequest } from '../../adapters/framework/adapter_types';
import { ReturnTypeBulkUnenroll } from '../../../common/return_types';
import { FleetServerLib } from '../../libs/types';

export const createPOSTAgentsUnenrollRoute = (libs: FleetServerLib) => ({
  method: 'POST',
  path: '/api/fleet/agents/unenroll',
  config: {
    validate: {
      payload: Joi.object({
        ids: Joi.array()
          .empty(false)
          .items(Joi.string())
          .optional(),
        kuery: Joi.string().optional(),
      }),
    },
  },
  handler: async (
    request: FrameworkRequest<{
      payload: {
        ids?: string[];
        kuery?: string;
      };
    }>
  ): Promise<ReturnTypeBulkUnenroll> => {
    const { ids, kuery } = request.payload;
    if ((!ids && !kuery) || (ids && kuery)) {
      throw Boom.badRequest('You need to specify ids or kuery');
    }

    let toUnenrollIds: string[] = ids || [];

    if (kuery) {
      let hasMore = true;
      let page = 1;
      while (hasMore) {
        const response = await libs.agents.list(request.user, {
          page: page++,
          perPage: 100,
          kuery,
        });
        if (response.agents.length === 0) {
          hasMore = false;
        }
        const agentIds = response.agents.filter(a => a.active).map(a => a.id);
        toUnenrollIds = toUnenrollIds.concat(agentIds);
      }
    }
    const results = (await libs.agents.unenroll(request.user, toUnenrollIds)).map(
      ({
        success,
        id,
        error,
      }): {
        success: boolean;
        id: string;
        action: 'unenrolled';
        error?: {
          message: string;
        };
      } => {
        return {
          success,
          id,
          action: 'unenrolled',
          error: error && {
            message: error.message,
          },
        };
      }
    );

    return {
      results,
      success: results.every(result => result.success),
    };
  },
});
