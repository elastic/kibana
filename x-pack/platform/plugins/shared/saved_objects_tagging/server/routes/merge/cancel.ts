/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TagsPluginRouter } from '../../types';
import { getTagMergeTaskId, type TagMergeTaskState } from '../../tasks/tag_merge';
import { DEFAULT_SPACE_ID, type MergeRouteDeps } from './types';

export const registerMergeCancelRoute = (
  router: TagsPluginRouter,
  { getStartServices, spacesService }: MergeRouteDeps
) => {
  router.post(
    {
      path: '/internal/saved_objects_tagging/tags/merge/cancel',
      security: {
        authz: {
          enabled: false,
          reason: 'This route only cancels the current user’s own merge job.',
        },
      },
      validate: {},
    },
    router.handleLegacyErrors(async (ctx, req, res) => {
      const spaceId = spacesService?.getSpaceId(req) ?? DEFAULT_SPACE_ID;
      const taskId = getTagMergeTaskId(spaceId);
      const [, { taskManager }] = await getStartServices();

      const task = await taskManager.get(taskId).catch(() => undefined);
      if (!task) {
        return res.notFound({ body: 'No merge job found in this space' });
      }
      if ((task.state as TagMergeTaskState).status !== 'in_progress') {
        // already finished; nothing to cancel
        return res.ok({ body: {} });
      }

      // `{ request: req }` is required here, not optional: this task's state carries an
      // encrypted `apiKey`/`userScope` (per-user execution, see start.ts), and
      // `TaskStore.getSoClientForUpdate` throws synchronously if asked to bulk-update a task
      // with encrypted fields without a request to build the decrypting SO client from.
      const { errors } = await taskManager.bulkUpdateState(
        [taskId],
        (state) => ({ ...state, cancelRequested: true }),
        { request: req }
      );
      if (errors.length > 0) {
        // e.g. a persistent version conflict after task manager's own retries: cancelRequested
        // was NOT persisted, so don't report success — the merge will keep running otherwise.
        return res.customError({
          statusCode: 500,
          body: `Failed to cancel the merge job: ${errors[0].error.message}`,
        });
      }
      // if the task is idle (between self-reschedules), nudge it to pick up the cancel promptly
      await taskManager.runSoon(taskId).catch(() => {});

      return res.ok({ body: {} });
    })
  );
};
