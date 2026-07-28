/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { MergePreviewObjectsResponse } from '../../../common/merge';
import type { TagsPluginRouter } from '../../types';

export const registerMergePreviewObjectsRoute = (router: TagsPluginRouter) => {
  router.get(
    {
      path: '/internal/saved_objects_tagging/tags/merge/preview/objects',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization as there is a separate authorization check within the merge service.',
        },
      },
      validate: {
        query: schema.object({
          toId: schema.string(),
          fromIds: schema.oneOf([
            schema.string(),
            schema.arrayOf(schema.string(), { minSize: 1, maxSize: 50 }),
          ]),
          page: schema.number({ min: 1, defaultValue: 1 }),
          perPage: schema.number({ min: 1, max: 100, defaultValue: 20 }),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { mergeService } = await ctx.tags;
      const { toId, fromIds: rawFromIds, page, perPage } = req.query;

      const fromIds = mergeService.normalizeFromIds(
        toId,
        typeof rawFromIds === 'string' ? [rawFromIds] : rawFromIds
      );
      if (fromIds.length === 0) {
        return res.badRequest({
          body: { message: '`fromIds` must contain at least one tag id other than `toId`' },
        });
      }

      const updatableTypes = await mergeService.getUpdatableTaggableTypes();
      const { objects, total } = await mergeService.findAffectedObjects({
        fromIds,
        types: updatableTypes,
        page,
        perPage,
      });

      return res.ok({
        body: { objects, total, page, perPage } as MergePreviewObjectsResponse,
      });
    })
  );
};
