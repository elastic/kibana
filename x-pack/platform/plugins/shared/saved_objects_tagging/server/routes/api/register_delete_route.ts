/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TagsPluginRouter } from '../../types';
import { handleRouteError } from './error_handler';
import { getRouteConfig } from './get_route_config';
import { tagIdParamSchema } from './schemas';

export const registerDeleteRoute = (router: TagsPluginRouter) => {
  const { basePath, routeConfig, routeVersion } = getRouteConfig();

  const deleteRoute = router.versioned.delete({
    path: `${basePath}/{id}`,
    summary: 'Delete a tag',
    ...routeConfig,
    description: 'Permanently deletes a tag by ID.',
  });

  deleteRoute.addVersion(
    {
      version: routeVersion,
      validate: {
        request: {
          params: tagIdParamSchema,
        },
        response: {
          204: {
            description: 'deleted',
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
        const { tagsClient } = await ctx.tags;
        await tagsClient.delete(id);
        return res.noContent();
      } catch (e) {
        if (SavedObjectsErrorHelpers.isNotFoundError(e as Error)) {
          return res.notFound({
            body: {
              message: `A tag with ID [${id}] was not found.`,
            },
          });
        }

        return handleRouteError(e as Error, res);
      }
    }
  );
};
