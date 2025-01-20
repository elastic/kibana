/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TagsPluginRouter } from '../../types';

export const registerDeleteTagRoute = (router: TagsPluginRouter) => {
  router.delete(
    {
      path: '/api/saved_objects_tagging/tags/{id}',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because the tags client internals leverages the SO client',
        },
      },
      validate: {
        params: schema.object({
          id: schema.string(),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { id } = req.params;
      const { tagsClient } = await ctx.tags;
      await tagsClient.delete(id);
      return res.ok();
    })
  );
};
