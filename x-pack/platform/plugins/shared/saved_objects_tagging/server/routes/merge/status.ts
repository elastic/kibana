/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MergeStatusResponse } from '../../../common/merge';
import type { TagsPluginRouter } from '../../types';
import {
  getTagMergeTaskId,
  type TagMergeTaskParams,
  type TagMergeTaskState,
} from '../../tasks/tag_merge';
import { DEFAULT_SPACE_ID, type MergeRouteDeps } from './types';

const idleStatus: MergeStatusResponse = {
  status: 'idle',
  phase: 'complete',
  progress: { updatedCount: 0 },
  deletion: [],
  errors: { count: 0, samples: [] },
};

/**
 * When `deleteSources` is requested, `finalizing` (deleting the source tags) is real remaining
 * work after every saved object has been updated — so `updating` only accounts for the first
 * half of the progress bar and `finalizing` the second half, rather than the bar reading 100%
 * while source tags haven't been touched yet.
 */
const computePercent = (
  state: TagMergeTaskState,
  { deleteSources, fromIds }: TagMergeTaskParams
): number | undefined => {
  if (state.totalAffected == null) {
    return undefined;
  }
  if (state.phase === 'complete') {
    return 100;
  }

  const updatingFraction = Math.min(1, state.updatedCount / Math.max(state.totalAffected, 1));

  if (!deleteSources) {
    return Math.round(updatingFraction * 100);
  }
  if (state.phase === 'finalizing') {
    const finalizingFraction = fromIds.length > 0 ? state.deletion.length / fromIds.length : 1;
    return Math.round(50 + finalizingFraction * 50);
  }
  return Math.round(updatingFraction * 50);
};

export const registerMergeStatusRoute = (
  router: TagsPluginRouter,
  { getStartServices, spacesService }: MergeRouteDeps
) => {
  router.get(
    {
      path: '/internal/saved_objects_tagging/tags/merge',
      security: {
        authz: {
          enabled: false,
          reason: 'This route only exposes the current user’s own merge job status.',
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
        return res.ok({ body: idleStatus });
      }

      const state = task.state as TagMergeTaskState;
      const params = task.params as TagMergeTaskParams;
      const percent = computePercent(state, params);

      return res.ok({
        body: {
          status: state.status,
          phase: state.phase,
          job: {
            toId: params.toId,
            fromIds: params.fromIds,
            deleteSources: params.deleteSources,
            startedAt: state.startedAt,
          },
          progress: {
            totalAffected: state.totalAffected,
            updatedCount: state.updatedCount,
            percent,
          },
          deletion: state.deletion,
          errors: state.errors,
        } as MergeStatusResponse,
      });
    })
  );
};
