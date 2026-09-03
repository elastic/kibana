/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
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
  /** Desired state. `undefined` — the block was removed — means the same as disabled. */
  feedbackAnalysis?: AiIndexFeedbackAnalysis;
  /** The space the schedule runs in, and therefore whose credentials the run uses. */
  spaceId: string;
}

export interface FeedbackAnalysisScheduleService {
  /**
   * Brings the managed workflow for one AI index in line with its configuration.
   *
   * The instance existing is the desired state, so this is just install-or-uninstall. Enabling
   * installs the per-index workflow, which puts its scheduled trigger in front of Task Manager;
   * disabling uninstalls it, leaving nothing scheduled behind.
   *
   * Changing the interval reinstalls with new template values, because a scheduled trigger's
   * interval is written into the YAML at install time and is not reachable by the engine's runtime
   * templating. Everything else about a run — which agent, which signals, which actions — is read
   * per run through the context endpoint, so only the interval needs this.
   */
  reconcile(params: ReconcileScheduleParams): Promise<void>;

  /**
   * Runs one analysis immediately, off-schedule, and returns the execution id.
   *
   * Only possible while analysis is enabled: disabling uninstalls the per-index workflow, so with
   * it off there is no instance to execute. The caller checks the configuration and explains that,
   * rather than offering an action that would fail here.
   */
  run(params: { aiIndexId: string; spaceId: string; request: KibanaRequest }): Promise<string>;

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
    // The settings route validates the interval, so a value that fails to parse here came from a
    // document written before that validation existed rather than from user input to reject.
    return parseIntervalMinutes(interval) ?? MIN_FEEDBACK_ANALYSIS_INTERVAL_MINUTES;
  };

  // Managed workflow document ids are global at the storage layer, so a per-instance id has to be
  // disambiguated by the entity it belongs to. An AI index id is already globally unique and the
  // registry has no space dimension, so it alone is the right suffix: one AI index gets exactly
  // one schedule. The space it lives in is whichever space last enabled it, which is also whose
  // credentials the run uses — signal selection reads every space regardless.
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

    async run({ aiIndexId, spaceId, request }) {
      const client = await getManagedWorkflowsClient();
      const executionId = await client.execute(
        request,
        CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
        {
          spaceId,
          workflowIdSuffix: aiIndexId,
          triggeredBy: 'manual',
        }
      );
      log.info(
        `Started an off-schedule feedback analysis run for AI index '${aiIndexId}' in space '${spaceId}'`
      );
      return executionId;
    },

    async remove({ aiIndexId, spaceId }) {
      await uninstall(aiIndexId, spaceId);
      log.debug(() => `Removed feedback analysis schedule for deleted AI index '${aiIndexId}'`);
    },
  };
};
