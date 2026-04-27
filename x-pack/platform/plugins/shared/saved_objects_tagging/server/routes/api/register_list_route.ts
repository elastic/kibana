/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObject } from '@kbn/core/server';
import { getMeta } from '@kbn/as-code-shared-schemas';
import type { TagsPluginRouter } from '../../types';
import type { TagAttributes } from '../../../common/types';
import { handleRouteError } from './error_handler';
import { getRouteConfig } from './get_route_config';
import { tagsListResponseBodySchema } from './schemas';
import { tagSavedObjectTypeName } from '../../../common/constants';

export const registerListRoute = (router: TagsPluginRouter) => {
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
    async (ctx, req, res) => {
      try {
        const { client } = (await ctx.core).savedObjects;
        const pitFinder = client.createPointInTimeFinder<TagAttributes>({
          type: tagSavedObjectTypeName,
          perPage: 1000,
        });

        const results: Array<SavedObject<TagAttributes>> = [];
        for await (const response of pitFinder.find()) {
          results.push(...response.saved_objects);
        }
        await pitFinder.close();

        const tags = results.map((savedObject) => ({
          id: savedObject.id,
          data: savedObject.attributes,
          meta: getMeta(savedObject),
        }));

        return res.ok({
          body: {
            tags,
            total: tags.length,
            page: 1,
          },
        });
      } catch (e) {
        return handleRouteError(e as Error, res);
      }
    }
  );
};
