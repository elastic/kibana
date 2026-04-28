/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getMeta } from '@kbn/as-code-shared-schemas';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { TagsPluginRouter } from '../../types';
import type { TagAttributes } from '../../../common/types';
import { getRandomColor } from '../../../common';
import { handleRouteError } from './error_handler';
import { getRouteConfig } from './get_route_config';
import { tagResponseItemSchema, tagIdParamSchema, tagRequestAttributesSchema } from './schemas';
import { tagSavedObjectTypeName } from '../../../common/constants';

export const registerUpsertRoute = (router: TagsPluginRouter) => {
  const { basePath, routeConfig, routeVersion } = getRouteConfig();

  const upsertRoute = router.versioned.put({
    path: `${basePath}/{id}`,
    summary: 'Upsert a tag',
    ...routeConfig,
    description: 'Updates a tag if it exists, or creates it at the provided ID.',
  });

  upsertRoute.addVersion(
    {
      version: routeVersion,
      validate: {
        request: {
          params: tagIdParamSchema,
          body: tagRequestAttributesSchema,
        },
        response: {
          200: {
            body: () => tagResponseItemSchema,
            description: 'updated',
          },
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
      const { id } = req.params;
      try {
        const { tagsClient } = await ctx.tags;
        const { client } = (await ctx.core).savedObjects;

        const existingTag = await tagsClient.findByName(req.body.name, { exact: true });
        if (existingTag && existingTag.id !== id) {
          return res.conflict({
            body: {
              message: `A tag with the name "${req.body.name}" already exists.`,
            },
          });
        }

        const attributes: TagAttributes = {
          name: req.body.name,
          description: req.body.description ?? '',
          color: req.body.color ?? getRandomColor(),
        };

        try {
          await tagsClient.update(id, attributes);
          const savedObject = await client.get<TagAttributes>(tagSavedObjectTypeName, id);
          const { description, ...restAttributes } = savedObject.attributes;
          return res.ok({
            body: {
              id: savedObject.id,
              data: {
                ...restAttributes,
                ...(description ? { description } : {}),
              },
              meta: getMeta(savedObject),
            },
          });
        } catch (e) {
          if (SavedObjectsErrorHelpers.isNotFoundError(e as Error)) {
            await tagsClient.create(attributes, { id });
            const savedObject = await client.get<TagAttributes>(tagSavedObjectTypeName, id);
            const { description, ...restAttributes } = savedObject.attributes;
            return res.created({
              body: {
                id: savedObject.id,
                data: {
                  ...restAttributes,
                  ...(description ? { description } : {}),
                },
                meta: getMeta(savedObject),
              },
            });
          }
          throw e;
        }
      } catch (e) {
        return handleRouteError(e as Error, res);
      }
    }
  );
};
