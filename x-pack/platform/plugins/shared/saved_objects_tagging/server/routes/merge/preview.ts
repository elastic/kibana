/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { MergePreviewResponse } from '../../../common/merge';
import type { TagsPluginRouter } from '../../types';
import { MergeError, computeAffectedCount } from '../../services';
import type { MergeRouteDeps } from './types';

export const registerMergePreviewRoute = (
  router: TagsPluginRouter,
  { getStartServices }: MergeRouteDeps
) => {
  router.post(
    {
      path: '/internal/saved_objects_tagging/tags/merge/preview',
      security: {
        authz: {
          enabled: false,
          reason:
            'This route is opted out from authorization as there is a separate authorization check within the merge service.',
        },
      },
      validate: {
        body: schema.object({
          toId: schema.string(),
          fromIds: schema.arrayOf(schema.string(), { minSize: 1, maxSize: 50 }),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { mergeService } = await ctx.tags;
      const { toId, fromIds: rawFromIds } = req.body;

      const fromIds = mergeService.normalizeFromIds(toId, rawFromIds);
      if (fromIds.length === 0) {
        return res.badRequest({
          body: { message: '`fromIds` must contain at least one tag id other than `toId`' },
        });
      }

      try {
        await mergeService.assertTagsNotManaged([toId, ...fromIds]);
      } catch (e) {
        if (e instanceof MergeError) {
          return res.customError({ statusCode: e.status, body: e.message });
        }
        throw e;
      }

      const updatableTypes = await mergeService.getUpdatableTaggableTypes();
      const { affectedCount, byType } = await mergeService.computeAffectedCount({
        fromIds,
        types: updatableTypes,
      });

      // Gate 2a needs the *true* set of affected types, independent of what this caller can
      // see — an internal repository bypasses per-user RBAC entirely (unlike the per-user client
      // above, which would silently narrow to `updatableTypes` and make the gate vacuous).
      const [core] = await getStartServices();
      const internalClient = core.savedObjects.getUnsafeInternalClient();
      const { byType: unrestrictedByType } = await computeAffectedCount(internalClient, {
        fromIds,
        types: mergeService.getKnownTaggableTypes(),
      });
      const affectedTypes = Object.entries(unrestrictedByType)
        .filter(([, count]) => count > 0)
        .map(([type]) => type);

      const [canStartMerge, canRequestDeleteSources] = await Promise.all([
        mergeService.checkStartGate({ affectedCount }),
        mergeService.checkDeleteSourcesGate({ updatableTypes, affectedTypes }),
      ]);

      return res.ok({
        body: {
          affectedCount,
          byType,
          canStartMerge,
          canRequestDeleteSources,
        } as MergePreviewResponse,
      });
    })
  );
};
