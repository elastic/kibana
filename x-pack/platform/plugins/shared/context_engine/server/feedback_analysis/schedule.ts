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
 * The workflows management calls this plugin makes, declared structurally rather than imported:
 * workflows management reaches back here through Agent Builder, so depending on its contract would
 * close a project reference cycle. Only the fields that are read are named.
 */
export interface WorkflowsManagementPort {
  updateWorkflow(
    workflowId: string,
    workflow: { enabled: boolean },
    spaceId: string,
    request: KibanaRequest
  ): Promise<unknown>;

  getWorkflowExecution(
    workflowExecutionId: string,
    spaceId: string
  ): Promise<{ status: string } | null>;
}

/**
 * Raised when a requested run collided with one already in flight for the same AI index.
 *
 * Not a failure of the request so much as an answer to it: the analysis the caller wanted is
 * happening, just not because of them.
 */
export class FeedbackAnalysisAlreadyRunningError extends Error {
  constructor(aiIndexId: string) {
    super(
      `Feedback analysis is already running for AI index [${aiIndexId}]. Its improvements appear when that run finishes.`
    );
    this.name = 'FeedbackAnalysisAlreadyRunningError';
  }
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

  /**
   * Runs one analysis immediately, off-schedule, and returns the execution id.
   *
   * Only possible while analysis is enabled: disabling uninstalls the per-index workflow, so with
   * it off there is no instance to execute. The caller checks the configuration and explains that,
   * rather than offering an action that would fail here.
   *
   * Throws {@link FeedbackAnalysisAlreadyRunningError} when a run for this index is already in
   * flight, which the workflow's own concurrency settings decide rather than this code.
   *
   * Takes no space: the instance lives where it was installed, not where the request came from.
   */
  run(params: { aiIndexId: string; request: KibanaRequest }): Promise<string>;

  /** Tears the schedule down when the AI index it analyzes is deleted. */
  remove(params: { aiIndexId: string; spaceId: string }): Promise<void>;
}

/**
 * A managed workflow instance is keyed by `(workflowId, spaceId)` while an AI index is global and
 * writable from any space, so the schedule is pinned here rather than taken from the request. A
 * request-scoped space would let an enable in one space and a disable in another address different
 * instances, leaving a run nobody can stop.
 */
// Importing DEFAULT_SPACE_ID from @kbn/spaces-plugin would close a project reference cycle through
// Agent Builder; hardcode the well-known value instead.
const SCHEDULE_SPACE_ID = 'default';

/**
 * What the execution engine marks a run it refused to start. Compared as a string rather than
 * imported as `ExecutionStatus.SKIPPED`, for the same reason the workflows calls above are
 * structural: importing the contract would close a project reference cycle.
 */
const DROPPED_EXECUTION_STATUS = 'skipped';

export const createFeedbackAnalysisScheduleService = ({
  logger,
  getManagedWorkflowsClient,
  workflowsManagement,
}: {
  logger: Logger;
  getManagedWorkflowsClient: () => Promise<PluginScopedManagedWorkflowsApi>;
  /** Optional at the plugin boundary, so a deployment without it cannot schedule analysis. */
  workflowsManagement?: WorkflowsManagementPort;
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

  /**
   * Whether the run that was just started was refused for colliding with one already in flight.
   *
   * The workflow declares `concurrency: { max: 1, strategy: drop }` per AI index, so the engine
   * already prevents two analyses of the same index from overlapping. It just does not say so:
   * a dropped run still gets an execution document, still gets its id returned, and is marked
   * `skipped` on the way out — so starting a run and being ignored looks exactly like starting one.
   * Reading the execution back is what tells the two apart. Nothing else skips a run at admission,
   * so the status alone is the signal, without matching on a human-readable reason.
   *
   * The read is an mget by id, which is realtime in Elasticsearch, so the skip is visible even
   * though it is written without waiting for a refresh.
   *
   * Fails open. Without workflows management there is nothing to ask, and a read that errors says
   * nothing about the run; reporting "already running" on that basis would replace a run the user
   * can retry with a message telling them not to.
   */
  const wasDropped = async (executionId: string): Promise<boolean> => {
    if (!workflowsManagement) {
      return false;
    }

    try {
      const execution = await workflowsManagement.getWorkflowExecution(
        executionId,
        SCHEDULE_SPACE_ID
      );
      return execution?.status === DROPPED_EXECUTION_STATUS;
    } catch (error) {
      log.warn(
        `Could not tell whether feedback analysis run '${executionId}' started: ${error.message}`
      );
      return false;
    }
  };

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
        // Always target SCHEDULE_SPACE_ID so the document ID matches what run() addresses.
        await uninstall(aiIndexId, SCHEDULE_SPACE_ID);
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
      // Install into SCHEDULE_SPACE_ID so run()'s workflowIdSuffix (which also uses
      // SCHEDULE_SPACE_ID) addresses the same workflow document regardless of which space
      // the enable/disable request came from.
      await client.install(CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID, {
        spaceId: SCHEDULE_SPACE_ID,
        workflowIdSuffix: workflowIdSuffixFor(aiIndexId, SCHEDULE_SPACE_ID),
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
        workflowDocumentIdFor(aiIndexId, SCHEDULE_SPACE_ID),
        { enabled: true },
        SCHEDULE_SPACE_ID,
        request
      );

      log.info(
        `Scheduled feedback analysis for AI index '${aiIndexId}' in space '${spaceId}' every ${intervalMinutes}m, running as the user who enabled it`
      );
    },

    async run({ aiIndexId, request }) {
      const client = await getManagedWorkflowsClient();
      const executionId = await client.execute(
        request,
        CONTEXT_ENGINE_FEEDBACK_ANALYSIS_WORKFLOW_ID,
        {
          spaceId: SCHEDULE_SPACE_ID,
          workflowIdSuffix: workflowIdSuffixFor(aiIndexId, SCHEDULE_SPACE_ID),
          triggeredBy: 'manual',
        }
      );

      if (await wasDropped(executionId)) {
        log.debug(
          () =>
            `Dropped an off-schedule feedback analysis run for AI index '${aiIndexId}': one is already running`
        );
        throw new FeedbackAnalysisAlreadyRunningError(aiIndexId);
      }

      log.info(`Started an off-schedule feedback analysis run for AI index '${aiIndexId}'`);
      return executionId;
    },

    async remove({ aiIndexId, spaceId }) {
      await uninstall(aiIndexId, SCHEDULE_SPACE_ID);
      log.debug(
        () =>
          `Removed feedback analysis schedule for deleted AI index '${aiIndexId}' in space '${spaceId}'`
      );
    },
  };
};
