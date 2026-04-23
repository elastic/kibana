/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import type { TagsPluginRouter } from '../../types';

export const registerGetAllTagsRoute = (router: TagsPluginRouter, logger: Logger) => {
  router.get(
    {
      path: '/api/saved_objects_tagging/tags',
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
      try {
        const { tagsClient } = await ctx.tags;
        const tags = await tagsClient.getAll();
        return res.ok({
          body: {
            tags,
          },
        });
      } catch (e) {
        logger.error(
          `GET /api/saved_objects_tagging/tags error: [${e.constructor?.name}] ${e.message} ` +
            `(statusCode: ${e.statusCode ?? 'N/A'}, isBoom: ${!!e.isBoom}, ` +
            `output.statusCode: ${e.output?.statusCode ?? 'N/A'})`
        );
        throw e;
      }
    })
  );
};
