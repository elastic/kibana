/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagsPluginRouter } from '../../types';

export const registerGetAllTagsRoute = (router: TagsPluginRouter) => {
  router.get(
    {
      path: '/api/saved_objects_tagging/tags',
      options: {
        deprecated: {
          documentationUrl: 'https://www.elastic.co/docs/api/doc/kibana/group/endpoint-tags',
          severity: 'warning',
          reason: { type: 'migrate', newApiMethod: 'GET', newApiPath: '/api/tags' },
        },
      },
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
      const { tagsClient } = await ctx.tags;
      const tags = await tagsClient.getAll();
      return res.ok({
        body: {
          tags,
        },
      });
    })
  );
};
