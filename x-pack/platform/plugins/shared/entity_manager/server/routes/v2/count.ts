/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';
import { z } from '@kbn/zod';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { READ_ENTITIES_PRIVILEGE } from '../../lib/v2/constants';

export const countEntitiesRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/v2/_count',
  security: {
    authz: {
      requiredPrivileges: [READ_ENTITIES_PRIVILEGE],
    },
  },
  params: z.object({
    body: z.object({
      types: z.optional(z.array(z.string())).default([]),
      filters: z.optional(z.array(z.string())).default([]),
      start: z
        .optional(z.string())
        .default(() => moment().subtract(5, 'minutes').toISOString())
        .refine((val) => moment(val).isValid(), {
          message: '[start] should be a date in ISO format',
        }),
      end: z
        .optional(z.string())
        .default(() => moment().toISOString())
        .refine((val) => moment(val).isValid(), {
          message: '[end] should be a date in ISO format',
        }),
    }),
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const client = await getScopedClient({ request });
      const result = await client.v2.countEntities(params.body);

      return response.ok({ body: result });
    } catch (e) {
      logger.error(e);
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
