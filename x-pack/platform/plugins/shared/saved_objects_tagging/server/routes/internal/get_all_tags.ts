/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagsPluginRouter } from '../../types';

export const registerInternalGetAllTagsRoute = (router: TagsPluginRouter) => {
  router.get(
    {
      path: '/internal/saved_objects_tagging/tags/_all',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization because the tags client internals leverages the SO client',
        },
      },
      validate: {},
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const client = (await ctx.tags).tagsClient;
      const tags = await client.getAll();

      return res.ok({
        body: {
          tags,
        },
      });
    })
  );
};
