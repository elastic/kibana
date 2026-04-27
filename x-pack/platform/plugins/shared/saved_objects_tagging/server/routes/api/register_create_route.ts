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
import { tagResponseItemSchema, tagAttributesSchema } from './schemas';
import { tagSavedObjectTypeName } from '../../../common/constants';

export const registerCreateRoute = (router: TagsPluginRouter) => {
  const { basePath, routeConfig, routeVersion } = getRouteConfig();

  const createRoute = router.versioned.post({
    path: `${basePath}`,
    summary: 'Create a tag',
    ...routeConfig,
    description: 'Creates a new tag and returns it.',
  });

  createRoute.addVersion(
    {
      version: routeVersion,
      validate: {
        request: {
          body: tagAttributesSchema,
        },
        response: {
          201: {
            body: () => tagResponseItemSchema,
            description: 'created',
          },
          400: {
            description: 'invalid request',
          },
          403: {
            description: 'forbidden',
          },
          409: {
            description: 'conflict',
          },
        },
      },
    },
    async (ctx, req, res) => {
      try {
        const { tagsClient } = await ctx.tags;
        const { client } = (await ctx.core).savedObjects;

        const existingTag = await tagsClient.findByName(req.body.name, { exact: true });
        if (existingTag) {
          return res.conflict({
            body: {
              message: `A tag with the name "${req.body.name}" already exists.`,
            },
          });
        }

        const tag = await tagsClient.create(req.body);
        const savedObject = await client.get<TagAttributes>(tagSavedObjectTypeName, tag.id);
        return res.created({
          body: {
            id: savedObject.id,
            data: savedObject.attributes,
            meta: getMeta(savedObject),
          },
        });
      } catch (e) {
        return handleRouteError(e as Error, res);
      }
    }
  );
};
