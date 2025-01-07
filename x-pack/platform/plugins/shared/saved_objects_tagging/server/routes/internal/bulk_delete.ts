/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TagsPluginRouter } from '../../types';

export const registerInternalBulkDeleteRoute = (router: TagsPluginRouter) => {
  router.post(
    {
      path: '/internal/saved_objects_tagging/tags/_bulk_delete',
      validate: {
        body: schema.object({
          ids: schema.arrayOf(schema.string()),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { ids: tagIds } = req.body;
      const client = (await ctx.tags).tagsClient;

      for (const tagId of tagIds) {
        await client.delete(tagId);
      }

      return res.ok({
        body: {},
      });
    })
  );
};
