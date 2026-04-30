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
import { tagsListResponseBodySchema } from '../schemas';
import { list } from './list';

export const registerListRoute = (router: TagsPluginRouter, usageCounter?: UsageCounter) => {
  const { basePath, routeConfig, routeVersion } = getRouteConfig();

  const listRoute = router.versioned.get({
    path: `${basePath}`,
    summary: 'List tags',
    ...routeConfig,
    description: 'Returns all tags.',
  });

  listRoute.addVersion(
    {
      version: routeVersion,
      validate: {
        request: {},
        response: {
          200: {
            body: () => tagsListResponseBodySchema,
            description: 'success',
          },
          403: {
            description: 'forbidden',
          },
        },
      },
    },
    async (ctx, req, res) =>
      telemetryHandler(req, usageCounter, async () => {
        try {
          return res.ok({
            body: await list(ctx),
          });
        } catch (e) {
          return handleRouteError(e as Error, res);
        }
      })
  );
};
