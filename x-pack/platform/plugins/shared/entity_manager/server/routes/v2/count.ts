/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { READ_ENTITIES_PRIVILEGE } from '../../lib/v2/constants';
import { countByTypesRt } from '../../lib/v2/types';

export const countEntitiesRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/v2/_count',
  security: {
    authz: {
      requiredPrivileges: [READ_ENTITIES_PRIVILEGE],
    },
  },
  params: z.object({
    body: countByTypesRt,
  }),
  handler: async ({ request, response, params, getScopedClient }) => {
    const client = await getScopedClient({ request });
    const result = await client.v2.countEntities(params.body);

    return response.ok({ body: result });
  },
});
