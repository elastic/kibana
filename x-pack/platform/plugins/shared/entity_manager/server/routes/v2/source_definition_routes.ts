/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import {
  CREATE_ENTITY_SOURCE_DEFINITION_PRIVILEGE,
  READ_ENTITY_SOURCE_DEFINITION_PRIVILEGE,
} from '../../lib/v2/constants';
import { entitySourceDefinitionRt } from '../../lib/v2/types';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { EntityDefinitionConflict } from '../../lib/v2/errors/entity_definition_conflict';

const createSourceDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/v2/definitions/sources',
  security: {
    authz: {
      requiredPrivileges: [CREATE_ENTITY_SOURCE_DEFINITION_PRIVILEGE],
    },
  },
  params: z.object({
    body: z.object({
      source: entitySourceDefinitionRt,
    }),
  }),
  handler: async ({ request, response, params, getScopedClient }) => {
    try {
      const client = await getScopedClient({ request });
      const source = await client.v2.storeSourceDefinition(params.body.source);

      return response.created({
        body: {
          source,
        },
        headers: {
          location: `GET /internal/entities/v2/definitions/sources/${source.id}`,
        },
      });
    } catch (error) {
      if (error instanceof EntityDefinitionConflict) {
        response.conflict({
          body: {
            message: error.message,
          },
        });
      }

      throw error;
    }
  },
});

const readSourceDefinitionsRoute = createEntityManagerServerRoute({
  endpoint: 'GET /internal/entities/v2/definitions/sources',
  security: {
    authz: {
      requiredPrivileges: [READ_ENTITY_SOURCE_DEFINITION_PRIVILEGE],
    },
  },
  handler: async ({ request, response, getScopedClient }) => {
    const client = await getScopedClient({ request });
    const sources = await client.v2.readSourceDefinitions();

    return response.ok({
      body: {
        sources,
      },
    });
  },
});

export const sourceDefinitionRoutes = {
  ...createSourceDefinitionRoute,
  ...readSourceDefinitionsRoute,
};
