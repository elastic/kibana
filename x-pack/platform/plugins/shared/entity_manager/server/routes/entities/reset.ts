/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { resetEntityDefinitionParamsSchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';

import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { readEntityDefinition } from '../../lib/entities/read_entity_definition';
import { EntityDefinitionNotFound } from '../../lib/entities/errors/entity_not_found';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { resetAllComponents } from '../../lib/entities/install_entity_definition';

export const resetEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'POST /internal/entities/definition/{id}/_reset',
  security: {
    authz: {
      enabled: false,
      reason:
        'This endpoint mainly manages Elasticsearch resources using the requesting users credentials',
    },
  },
  params: z.object({
    path: resetEntityDefinitionParamsSchema,
  }),
  handler: async ({ context, response, params, logger }) => {
    try {
      const soClient = (await context.core).savedObjects.client;
      const esClient = (await context.core).elasticsearch.client.asCurrentUser;

      const definition = await readEntityDefinition(soClient, params.path.id, logger);
      await resetAllComponents(esClient, definition, logger);

      return response.ok({ body: { acknowledged: true } });
    } catch (e) {
      logger.error(e);

      if (e instanceof EntityDefinitionNotFound) {
        return response.notFound({ body: e });
      }
      if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
        return response.customError({ body: e, statusCode: 400 });
      }
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
