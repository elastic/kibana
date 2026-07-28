/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { TagsPluginRouter } from '../../types';
import { MergeError, computeAffectedCount } from '../../services';
import {
  getTagMergeTaskId,
  initialTagMergeTaskState,
  TAG_MERGE_TASK_TYPE,
} from '../../tasks/tag_merge';
import { DEFAULT_SPACE_ID, type MergeRouteDeps } from './types';

export const registerMergeStartRoute = (
  router: TagsPluginRouter,
  { getStartServices, spacesService }: MergeRouteDeps
) => {
  router.post(
    {
      path: '/internal/saved_objects_tagging/tags/merge',
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
          deleteSources: schema.boolean({ defaultValue: false }),
        }),
      },
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const { mergeService } = await ctx.tags;
      const { toId, fromIds: rawFromIds, deleteSources } = req.body;
      const spaceId = spacesService?.getSpaceId(req) ?? DEFAULT_SPACE_ID;

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

      const [core, { taskManager, security }] = await getStartServices();

      const updatableTypes = await mergeService.getUpdatableTaggableTypes();
      // Recomputed independently of whatever the client's earlier preview call showed — never
      // trust a client-supplied or stale affected count for an authorization decision.
      const { affectedCount } = await mergeService.computeAffectedCount({
        fromIds,
        types: updatableTypes,
      });
      const canStartMerge = await mergeService.checkStartGate({ affectedCount });
      if (!canStartMerge.allowed) {
        return res.forbidden({ body: { message: canStartMerge.reasons.join('; ') } });
      }
      if (deleteSources) {
        // Gate 2a needs the *true* set of affected types, independent of what this caller can
        // see — an internal client bypasses per-user RBAC entirely (unlike the per-user client
        // above, which would silently narrow to `updatableTypes` and make the gate vacuous).
        const internalClient = core.savedObjects.getUnsafeInternalClient();
        const { byType: unrestrictedByType } = await computeAffectedCount(internalClient, {
          fromIds,
          types: mergeService.getKnownTaggableTypes(),
        });
        const affectedTypes = Object.entries(unrestrictedByType)
          .filter(([, count]) => count > 0)
          .map(([type]) => type);

        const canRequestDeleteSources = await mergeService.checkDeleteSourcesGate({
          updatableTypes,
          affectedTypes,
        });
        if (!canRequestDeleteSources.allowed) {
          return res.forbidden({ body: { message: canRequestDeleteSources.reasons.join('; ') } });
        }
      }

      if (!security) {
        return res.customError({
          statusCode: 501,
          body: 'The security plugin is required to run tag merge jobs',
        });
      }

      const taskId = getTagMergeTaskId(spaceId);
      const existing = await taskManager.get(taskId).catch(() => undefined);
      if (existing?.state?.status === 'in_progress') {
        return res.customError({
          statusCode: 409,
          body: 'A merge job is already in progress in this space',
        });
      }
      if (existing) {
        await taskManager.removeIfExists(taskId);
      }

      // Passing `request` here (not a pre-built apiKey) is what makes this per-user: Task
      // Manager itself grants an API key scoped to `req`'s own privileges and persists it as
      // `apiKey`/`userScope` on the task. Setting those fields directly on the task instance
      // instead would silently do nothing — `taskInstanceToAttributes` strips them, since this
      // `request`-based grant is the only supported way to populate them.
      await taskManager.schedule(
        {
          id: taskId,
          taskType: TAG_MERGE_TASK_TYPE,
          params: { toId, fromIds, deleteSources },
          state: initialTagMergeTaskState(),
          scope: ['savedObjectsTagging'],
        },
        { request: req }
      );

      return res.ok({ body: {} });
    })
  );
};
