/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
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
  /** The space the schedule runs in and whose credentials the run uses. */
  spaceId: string;
}

export interface FeedbackAnalysisScheduleService {
  /** Brings the managed workflow for one AI index in line with its configuration. */
  reconcile(params: ReconcileScheduleParams): Promise<void>;

  /** Tears the schedule down when the AI index it analyzes is deleted. */
  remove(params: { aiIndexId: string; spaceId: string }): Promise<void>;
}

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

  const uninstall = async (aiIndexId: string, spaceId: string) => {
    const client = await getManagedWorkflowsClient();
    await client.uninstall(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId,
      workflowIdSuffix: aiIndexId,
    });
  };

  return {
    async reconcile({ aiIndexId, feedbackAnalysis, spaceId }) {
      if (!feedbackAnalysis?.enabled) {
        await uninstall(aiIndexId, spaceId);
        log.debug(() => `Removed feedback analysis schedule for AI index '${aiIndexId}'`);
        return;
      }

      const client = await getManagedWorkflowsClient();
      await client.install(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
        spaceId,
        workflowIdSuffix: aiIndexId,
        values: {
          aiIndexId,
          intervalMinutes: intervalMinutesFor(feedbackAnalysis),
        },
      });
      log.info(
        `Scheduled feedback analysis for AI index '${aiIndexId}' in space '${spaceId}' every ${intervalMinutesFor(
          feedbackAnalysis
        )}m`
      );
    },

    async remove({ aiIndexId, spaceId }) {
      await uninstall(aiIndexId, spaceId);
      log.debug(() => `Removed feedback analysis schedule for deleted AI index '${aiIndexId}'`);
    },
  };
};
