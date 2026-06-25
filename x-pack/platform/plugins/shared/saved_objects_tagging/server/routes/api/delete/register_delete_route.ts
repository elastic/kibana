/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UsageCounter } from '@kbn/usage-collection-plugin/server';
import { telemetryHandler } from '@kbn/as-code-shared-telemetry';
import type { TagsPluginRouter } from '../../../types';
import { handleRouteError } from '../error_handler';
import { getRouteConfig } from '../get_route_config';
import { tagIdParamSchema } from '../schemas';
import { deleteTag } from './delete';

export const registerDeleteRoute = (router: TagsPluginRouter, usageCounter?: UsageCounter) => {
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
    async (ctx, req, res) =>
      telemetryHandler(req, usageCounter, async () => {
        const { id } = req.params;
        try {
          await deleteTag(ctx, id);
          return res.noContent();
        } catch (e) {
          return handleRouteError(e as Error, res, {
            notFoundMessage: `A tag with ID [${id}] was not found.`,
          });
        }
      })
  );
};
