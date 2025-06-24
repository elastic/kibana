/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  CREATE_ENTITY_TYPE_DEFINITION_PRIVILEGE,
  READ_ENTITY_TYPE_DEFINITION_PRIVILEGE,
} from '../../lib/v2/constants';
import { entityTypeDefinitionRt } from '../../lib/v2/types';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { EntityDefinitionConflict } from '../../lib/v2/errors/entity_definition_conflict';

const createTypeDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/v2/definitions/types',
  security: {
    authz: {
      requiredPrivileges: [CREATE_ENTITY_TYPE_DEFINITION_PRIVILEGE],
    },
  },
  params: z.object({
    body: z.object({
      type: entityTypeDefinitionRt,
    }),
  }),
  handler: async ({ request, response, params, getScopedClient }) => {
    try {
      const client = await getScopedClient({ request });
      const type = await client.v2.storeTypeDefinition(params.body.type);

      return response.created({
        body: {
          type,
        },
        headers: {
          location: `GET /internal/entities/v2/definitions/types/${type.id}`,
        },
      });
    } catch (error) {
      if (error instanceof EntityDefinitionConflict) {
        return response.conflict({
          body: {
            message: error.message,
          },
        });
      }

      throw error;
    }
  },
});

const readTypeDefinitionsRoute = createEntityManagerServerRoute({
  endpoint: 'GET /internal/entities/v2/definitions/types',
  security: {
    authz: {
      requiredPrivileges: [READ_ENTITY_TYPE_DEFINITION_PRIVILEGE],
    },
  },
  handler: async ({ request, response, getScopedClient }) => {
    const client = await getScopedClient({ request });
    const types = await client.v2.readTypeDefinitions();

    return response.ok({
      body: {
        types,
      },
    });
  },
});

export const typeDefinitionRoutes = {
  ...createTypeDefinitionRoute,
  ...readTypeDefinitionsRoute,
};
