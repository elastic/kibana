/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { entityDefinitionUpdateSchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { EntitySecurityException } from '../../lib/entities/errors/entity_security_exception';
import { InvalidTransformError } from '../../lib/entities/errors/invalid_transform_error';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';
import { EntityDefinitionNotFound } from '../../lib/entities/errors/entity_not_found';
import { EntityDefinitionUpdateConflict } from '../../lib/entities/errors/entity_definition_update_conflict';
import { findEntityDefinitionById } from '../../lib/entities/find_entity_definition';
import { canManageEntityDefinition } from '../../lib/auth';

/**
 * @openapi
 * /internal/entities/definition:
 *   patch:
 *     description: Update an entity definition.
 *     tags:
 *       - definitions
 *     parameters:
 *       - in: path
 *         name: id
 *         description: The entity definition ID
 *         schema:
 *           type: string
 *         required: true
 *     requestBody:
 *       description: The definition properties to update
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/entityDefinitionUpdateSchema'
 *     responses:
 *       200:
 *         description: Success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/entityDefinitionSchema'
 *       400:
 *         description: The entity definition cannot be installed; see the error for more details
 *       404:
 *         description: The entity definition does not exist
 *       403:
 *         description: User is not allowed to update the entity definition
 *       409:
 *         description: The entity definition is being updated by another request
 */
export const updateEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'PATCH /internal/entities/definition/{id}',
  security: {
    authz: {
      enabled: false,
      reason:
        'This endpoint mainly manages Elasticsearch resources using the requesting users credentials',
    },
  },
  params: z.object({
    path: z.object({ id: z.string() }),
    body: entityDefinitionUpdateSchema,
  }),
  handler: async ({ context, request, response, params, logger, getScopedClient }) => {
    try {
      const core = await context.core;
      const definition = await findEntityDefinitionById({
        id: params.path.id,
        esClient: core.elasticsearch.client.asCurrentUser,
        soClient: core.savedObjects.client,
      });
      if (!definition) {
        throw new EntityDefinitionNotFound(`Unable to find entity definition [${params.path.id}]`);
      }

      const isAuthorized = await canManageEntityDefinition(
        core.elasticsearch.client.asCurrentUser,
        params.body.indexPatterns ?? definition.indexPatterns
      );
      if (!isAuthorized) {
        return response.forbidden({
          body: {
            message:
              'Current Kibana user does not have the required permissions to update the entity definition',
          },
        });
      }

      const entityClient = await getScopedClient({ request });
      const updatedDefinition = await entityClient.updateEntityDefinition({
        id: params.path.id,
        definitionUpdate: params.body,
      });

      return response.ok({ body: updatedDefinition });
    } catch (e) {
      logger.error(e);

      if (e instanceof EntityDefinitionNotFound) {
        return response.notFound({
          body: { message: `Entity definition [${params.path.id}] not found` },
        });
      }

      if (e instanceof EntityDefinitionUpdateConflict) {
        return response.conflict({
          body: { message: `Entity definition [${params.path.id}] has changes in progress` },
        });
      }

      if (e instanceof EntitySecurityException || e instanceof InvalidTransformError) {
        return response.customError({ body: e, statusCode: 400 });
      }

      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
