/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import type { TagsPluginRouter } from '../../types';
import type { TagAttributes } from '../../../common/types';
import { handleRouteError } from './error_handler';
import { getRouteConfig } from './get_route_config';
import { tagResponseItemSchema, tagIdParamSchema } from './schemas';
import { tagSavedObjectTypeName } from '../../../common/constants';

export const registerReadRoute = (router: TagsPluginRouter) => {
  const { basePath, routeConfig, routeVersion } = getRouteConfig();

  const readRoute = router.versioned.get({
    path: `${basePath}/{id}`,
    summary: 'Get a tag',
    ...routeConfig,
    description: 'Returns a tag by ID.',
  });

  readRoute.addVersion(
    {
      version: routeVersion,
      validate: {
        request: {
          params: tagIdParamSchema,
        },
        response: {
          200: {
            body: () => tagResponseItemSchema,
            description: 'success',
          },
          403: {
            description: 'forbidden',
          },
          404: {
            description: 'not found',
          },
        },
      },
    },
    async (ctx, req, res) => {
      const { id } = req.params;
      try {
        const { client } = (await ctx.core).savedObjects;
        const savedObject = await client.get<TagAttributes>(tagSavedObjectTypeName, id);
        return res.ok({
          body: {
            id: savedObject.id,
            data: savedObject.attributes,
            meta: getMeta(savedObject),
          },
        });
      } catch (e) {
        return handleRouteError(e as Error, res, {
          notFoundMessage: `A tag with ID [${id}] was not found.`,
        });
      }
    }
  );
};
