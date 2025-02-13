/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getEntityDefinitionQuerySchema } from '@kbn/entities-schema';
import { z } from '@kbn/zod';
import { createEntityManagerServerRoute } from '../create_entity_manager_server_route';

/**
 * @openapi
 * /internal/entities/definition:
 *   get:
 *     description: Get all installed entity definitions.
 *     tags:
 *       - definitions
 *     parameters:
 *       - in: path
 *         name: id
 *         description: The entity definition ID
 *         schema:
 *           $ref: '#/components/schemas/deleteEntityDefinitionParamsSchema/properties/id'
 *         required: false
 *       - in: query
 *         name: page
 *         schema:
 *           $ref: '#/components/schemas/getEntityDefinitionQuerySchema/properties/page'
 *       - in: query
 *         name: perPage
 *         schema:
 *           $ref: '#/components/schemas/getEntityDefinitionQuerySchema/properties/perPage'
 *       - in: query
 *         name: includeState
 *         schema:
 *           $ref: '#/components/schemas/getEntityDefinitionQuerySchema/properties/includeState'
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 definitions:
 *                   type: array
 *                   items:
 *                     allOf:
 *                       - $ref: '#/components/schemas/entityDefinitionSchema'
 */
export const getEntityDefinitionRoute = createEntityManagerServerRoute({
  endpoint: 'GET /internal/entities/definition/{id?}',
  security: {
    authz: {
      enabled: false,
      reason:
        'This endpoint mainly manages Elasticsearch resources using the requesting users credentials',
    },
  },
  params: z.object({
    query: getEntityDefinitionQuerySchema,
    path: z.object({ id: z.optional(z.string()) }),
  }),
  handler: async ({ request, response, params, logger, getScopedClient }) => {
    try {
      const client = await getScopedClient({ request });
      const result = await client.getEntityDefinitions({
        id: params.path?.id,
        page: params.query.page,
        perPage: params.query.perPage,
        includeState: params.query.includeState,
      });

      return response.ok({ body: result });
    } catch (e) {
      logger.error(e);
      return response.customError({ body: e, statusCode: 500 });
    }
  },
});
