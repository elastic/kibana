/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { KibanaRequest, Logger } from '@kbn/core/server';
import { CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  DEFAULT_FEEDBACK_ANALYSIS_INTERVAL,
  MIN_FEEDBACK_ANALYSIS_INTERVAL_MINUTES,
} from '../../common/constants';
import type { AiIndexFeedbackAnalysis } from '../../common/http_api/ai_indices';
import { parseIntervalMinutes } from '../../common/validation';

/** 64 bits of SHA-256, hex-encoded: fixed width, and wide enough not to collide across spaces. */
const SPACE_HASH_LENGTH = 16;

/**
 * The one workflows management call this plugin makes, declared structurally rather than imported:
 * workflows management reaches back here through Agent Builder, so depending on its contract would
 * close a project reference cycle.
 */
export interface WorkflowEnablementApi {
  updateWorkflow(
    workflowId: string,
    workflow: { enabled: boolean },
    spaceId: string,
    request: KibanaRequest
  ): Promise<unknown>;
}

export interface ReconcileScheduleParams {
  aiIndexId: string;
  /** Space the AI index lives in; the managed workflow instance is installed into this space. */
  spaceId: string;
  /** Desired state; `undefined` means disabled. */
  feedbackAnalysis?: AiIndexFeedbackAnalysis;
  /**
   * The request that asked for this state. Enabling runs analysis on its behalf, because the
   * scheduled trigger executes under an API key minted from it.
   */
  request: KibanaRequest;
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
  workflowsManagement,
}: {
  logger: Logger;
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  /** Optional at the plugin boundary, so a deployment without it cannot schedule analysis. */
  workflowsManagement?: WorkflowEnablementApi;
}): FeedbackAnalysisScheduleService => {
  const log = logger.get('feedback_analysis_schedule');

  /**
   * A managed workflow document id is `<definition id>-<suffix>` and is the ES `_id`, which is
   * unique per index regardless of the document's `spaceId`. An AI index id is only unique within
   * its space, so the suffix has to carry the space too or the same id in two spaces shares one
   * document: the second install silently keeps the first space's `spaceId`, and either space's
   * delete tears down the other's schedule.
   *
   * The space is hashed rather than appended: both ids allow hyphens, so `<space>-<aiIndexId>`
   * would make `('a-b', 'c')` and `('a', 'b-c')` collide, and space ids have no length cap while
   * the `_id` does.
   */
  const workflowIdSuffixFor = (aiIndexId: string, spaceId: string) =>
    `${aiIndexId}-${createHash('sha256')
      .update(spaceId)
      .digest('hex')
      .slice(0, SPACE_HASH_LENGTH)}`;

  const workflowDocumentIdFor = (aiIndexId: string, spaceId: string) =>
    `${CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID}-${workflowIdSuffixFor(aiIndexId, spaceId)}`;

  const intervalMinutesFor = (feedbackAnalysis: AiIndexFeedbackAnalysis): number => {
    const interval = feedbackAnalysis.schedule?.interval ?? DEFAULT_FEEDBACK_ANALYSIS_INTERVAL;
    return parseIntervalMinutes(interval) ?? MIN_FEEDBACK_ANALYSIS_INTERVAL_MINUTES;
  };

  const uninstall = async (aiIndexId: string, spaceId: string) => {
    const client = await getManagedWorkflowsClient();
    await client.uninstall(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
      spaceId,
      workflowIdSuffix: workflowIdSuffixFor(aiIndexId, spaceId),
    });
  };

  return {
    async reconcile({ aiIndexId, spaceId, feedbackAnalysis, request }) {
      if (!feedbackAnalysis?.enabled) {
        // Uninstalling drops the trigger task with the document, so disabling needs no request.
        await uninstall(aiIndexId, spaceId);
        log.debug(
          () =>
            `Removed feedback analysis schedule for AI index '${aiIndexId}' in space '${spaceId}'`
        );
        return;
      }

      if (!workflowsManagement) {
        throw new Error(
          `Cannot schedule feedback analysis for AI index '${aiIndexId}': the workflows management plugin is not available to enable the workflow, and installing it alone would leave it unscheduled.`
        );
      }

      const intervalMinutes = intervalMinutesFor(feedbackAnalysis);
      const client = await getManagedWorkflowsClient();
      await client.install(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
        spaceId,
        workflowIdSuffix: workflowIdSuffixFor(aiIndexId, spaceId),
        values: {
          aiIndexId,
          intervalMinutes,
        },
      });

      // Installing writes the workflow document and stops there. Enabling is what puts the
      // scheduled trigger in front of Task Manager, under an API key minted from this request —
      // so this call, not the install above, is what makes analysis actually run. Re-enabling an
      // already-enabled instance re-mints that key, which is why every write of the configuration
      // reconciles: the schedule then follows whoever last saved it rather than expiring with the
      // account that first turned it on.
      await workflowsManagement.updateWorkflow(
        workflowDocumentIdFor(aiIndexId, spaceId),
        { enabled: true },
        spaceId,
        request
      );

      log.info(
        `Scheduled feedback analysis for AI index '${aiIndexId}' in space '${spaceId}' every ${intervalMinutes}m, running as the user who enabled it`
      );
    },

    async remove({ aiIndexId, spaceId }) {
      await uninstall(aiIndexId, spaceId);
      log.debug(
        () =>
          `Removed feedback analysis schedule for deleted AI index '${aiIndexId}' in space '${spaceId}'`
      );
    },
  };
};
