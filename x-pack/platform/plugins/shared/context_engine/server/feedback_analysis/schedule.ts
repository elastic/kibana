/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import { CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  DEFAULT_FEEDBACK_ANALYSIS_INTERVAL,
  MIN_FEEDBACK_ANALYSIS_INTERVAL_MINUTES,
} from '../../common/constants';
import type { AiIndexFeedbackAnalysis } from '../../common/http_api/ai_indices';
import { parseIntervalMinutes } from '../../common/validation';

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
  workflowsManagement,
}: {
  logger: Logger;
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  /** Optional at the plugin boundary, so a deployment without it cannot schedule analysis. */
  workflowsManagement?: WorkflowEnablementApi;
}): FeedbackAnalysisScheduleService => {
  const log = logger.get('feedback_analysis_schedule');

  /**
   * Managed workflow document ids are `<definition id>-<suffix>`, and an AI index id is already
   * globally unique, so it alone identifies an instance.
   */
  const workflowDocumentIdFor = (aiIndexId: string) =>
    `${CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID}-${aiIndexId}`;

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
    async reconcile({ aiIndexId, feedbackAnalysis, request }) {
      if (!feedbackAnalysis?.enabled) {
        // Uninstalling drops the trigger task with the document, so disabling needs no request.
        await uninstall(aiIndexId);
        log.debug(() => `Removed feedback analysis schedule for AI index '${aiIndexId}'`);
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
        spaceId: SCHEDULE_SPACE_ID,
        workflowIdSuffix: aiIndexId,
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
        workflowDocumentIdFor(aiIndexId),
        { enabled: true },
        SCHEDULE_SPACE_ID,
        request
      );

      log.info(
        `Scheduled feedback analysis for AI index '${aiIndexId}' every ${intervalMinutes}m, running as the user who enabled it`
      );
    },

    async remove({ aiIndexId }) {
      await uninstall(aiIndexId);
      log.debug(() => `Removed feedback analysis schedule for deleted AI index '${aiIndexId}'`);
    },
  };
};
