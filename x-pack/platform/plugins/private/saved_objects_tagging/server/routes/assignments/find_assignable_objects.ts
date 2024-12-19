/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { FindAssignableObjectResponse } from '../../../common/http_api_types';
import type { TagsPluginRouter } from '../../types';

export const registerFindAssignableObjectsRoute = (router: TagsPluginRouter) => {
  router.get(
    {
      path: '/internal/saved_objects_tagging/assignments/_find_assignable_objects',
      validate: {
        query: schema.object({
          search: schema.maybe(schema.string()),
          max_results: schema.number({ min: 0, defaultValue: 1000 }),
          types: schema.maybe(schema.oneOf([schema.string(), schema.arrayOf(schema.string())])),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { assignmentService } = await ctx.tags;
      const { query } = req;

      const results = await assignmentService.findAssignableObjects({
        search: query.search,
        types: typeof query.types === 'string' ? [query.types] : query.types,
        maxResults: query.max_results,
      });

      return res.ok({
        body: {
          objects: results,
        } as FindAssignableObjectResponse,
      });
    })
  );
};
