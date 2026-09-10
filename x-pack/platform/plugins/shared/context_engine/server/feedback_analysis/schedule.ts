/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  DEFAULT_FEEDBACK_ANALYSIS_INTERVAL,
  MIN_FEEDBACK_ANALYSIS_INTERVAL_MINUTES,
} from '../../common/constants';
import type { AiIndexFeedbackAnalysis } from '../../common/http_api/ai_indices';
import { parseIntervalMinutes } from '../../common/validation';

export interface ReconcileScheduleParams {
  aiIndexId: string;
  /** Desired state; `undefined` means disabled. */
  feedbackAnalysis?: AiIndexFeedbackAnalysis;
}

export interface FeedbackAnalysisScheduleService {
  /** Brings the managed workflow for one AI index in line with its configuration. */
  reconcile(params: ReconcileScheduleParams): Promise<void>;

  /** Tears the schedule down when the AI index it analyzes is deleted. */
  remove(params: { aiIndexId: string }): Promise<void>;
}

/**
 * A managed workflow instance is keyed by `(workflowId, spaceId)` while an AI index is global and
 * writable from any space, so the schedule is pinned here rather than taken from the request. A
 * request-scoped space would let an enable in one space and a disable in another address different
 * instances, leaving a run nobody can stop.
 */
const SCHEDULE_SPACE_ID = DEFAULT_SPACE_ID;

export const createFeedbackAnalysisScheduleService = ({
  logger,
  getManagedWorkflowsClient,
}: {
  logger: Logger;
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
}): FeedbackAnalysisScheduleService => {
  const log = logger.get('feedback_analysis_schedule');

  const intervalMinutesFor = (feedbackAnalysis: AiIndexFeedbackAnalysis): number => {
    const interval = feedbackAnalysis.schedule?.interval ?? DEFAULT_FEEDBACK_ANALYSIS_INTERVAL;
    return parseIntervalMinutes(interval) ?? MIN_FEEDBACK_ANALYSIS_INTERVAL_MINUTES;
  };

  const uninstall = async (aiIndexId: string) => {
    const client = await getManagedWorkflowsClient();
    await client.uninstall(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId: SCHEDULE_SPACE_ID,
      workflowIdSuffix: aiIndexId,
    });
  };

  return {
    async reconcile({ aiIndexId, feedbackAnalysis }) {
      if (!feedbackAnalysis?.enabled) {
        await uninstall(aiIndexId);
        log.debug(() => `Removed feedback analysis schedule for AI index '${aiIndexId}'`);
        return;
      }

      const client = await getManagedWorkflowsClient();
      await client.install(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
        spaceId: SCHEDULE_SPACE_ID,
        workflowIdSuffix: aiIndexId,
        values: {
          aiIndexId,
          intervalMinutes: intervalMinutesFor(feedbackAnalysis),
        },
      });
      log.info(
        `Scheduled feedback analysis for AI index '${aiIndexId}' every ${intervalMinutesFor(
          feedbackAnalysis
        )}m`
      );
    },

    async remove({ aiIndexId }) {
      await uninstall(aiIndexId);
      log.debug(() => `Removed feedback analysis schedule for deleted AI index '${aiIndexId}'`);
    },
  };
};
