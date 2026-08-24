/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import { CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID } from '@kbn/workflows/managed';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';
import {
  FEEDBACK_LOOP_SCHEDULE_INTERVAL_MINUTES,
  IMPROVEMENTS_INTERNAL_API_VERSION,
} from '../../common/constants';
import type { FeedbackScheduleStatus } from '../../common/http_api/feedback_loop';
import type { WorkflowProvider } from '../workflows/provider';

/** Raised when the feedback loop cannot run because its workflow plumbing is not available. */
export class FeedbackScheduleUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FeedbackScheduleUnavailableError';
  }
}

export interface FeedbackScheduleService {
  /** Whether the scheduled analysis is on for this AI index, and the workflow backing it. */
  getStatus(args: { spaceId: string; aiIndexId: string }): Promise<FeedbackScheduleStatus>;
  /** Turns the schedule on or off. Enabling binds the caller's credentials to the scheduled runs. */
  setEnabled(args: {
    spaceId: string;
    aiIndexId: string;
    enabled: boolean;
    request: KibanaRequest;
  }): Promise<FeedbackScheduleStatus>;
  /** Runs the loop once now, whether or not the schedule is on. Resolves the execution id. */
  run(args: { spaceId: string; aiIndexId: string; request: KibanaRequest }): Promise<string>;
  /** Best-effort removal of an index's workflow instance, for when the index itself is deleted. */
  uninstall(args: { spaceId: string; aiIndexId: string }): Promise<void>;
}

/**
 * Managed workflow document ids are global — the document carries a `spaceId` field, but the id
 * itself is not namespaced. So the suffix has to carry both the space and the AI index, or two
 * spaces with an index of the same name would collide on one document.
 */
export const buildFeedbackWorkflowSuffix = (spaceId: string, aiIndexId: string): string =>
  `${spaceId}-${aiIndexId}`;

export const createFeedbackScheduleService = ({
  getManagedWorkflows,
  getWorkflowProvider,
  logger,
}: {
  getManagedWorkflows: () => Promise<PluginScopedManagedWorkflowsApi | undefined>;
  getWorkflowProvider: () => WorkflowProvider | undefined;
  logger: Logger;
}): FeedbackScheduleService => {
  const requireManagedWorkflows = async (): Promise<PluginScopedManagedWorkflowsApi> => {
    const managedWorkflows = await getManagedWorkflows();
    if (!managedWorkflows) {
      throw new FeedbackScheduleUnavailableError(
        'The Workflows plugin is not available, so the feedback loop cannot be scheduled or run.'
      );
    }
    return managedWorkflows;
  };

  const requireWorkflowProvider = (): WorkflowProvider => {
    const provider = getWorkflowProvider();
    if (!provider) {
      throw new FeedbackScheduleUnavailableError(
        'The Workflows plugin is not available, so the feedback loop schedule cannot be changed.'
      );
    }
    return provider;
  };

  /**
   * Installing is idempotent and preserves the enabled state, so every entry point can install
   * first rather than depending on some earlier call having done it.
   */
  const install = async ({ spaceId, aiIndexId }: { spaceId: string; aiIndexId: string }) => {
    const managedWorkflows = await requireManagedWorkflows();
    await managedWorkflows.install(CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID, {
      spaceId,
      workflowIdSuffix: buildFeedbackWorkflowSuffix(spaceId, aiIndexId),
      values: {
        aiIndexId,
        intervalMinutes: FEEDBACK_LOOP_SCHEDULE_INTERVAL_MINUTES,
        apiVersion: IMPROVEMENTS_INTERNAL_API_VERSION,
      },
    });
  };

  const getStatus: FeedbackScheduleService['getStatus'] = async ({ spaceId, aiIndexId }) => {
    const managedWorkflows = await requireManagedWorkflows();
    const report = await managedWorkflows.getWorkflowStatus(
      CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID,
      { spaceId, workflowIdSuffix: buildFeedbackWorkflowSuffix(spaceId, aiIndexId) }
    );

    if (!report.installed) {
      return { enabled: false };
    }
    return { enabled: report.enabled === true, workflow_id: report.workflowId };
  };

  return {
    getStatus,

    async setEnabled({ spaceId, aiIndexId, enabled, request }) {
      // Disabling something that was never installed is already the requested state, and
      // installing just to disable would leave a workflow behind for no reason.
      if (!enabled) {
        const current = await getStatus({ spaceId, aiIndexId });
        if (!current.workflow_id) {
          return { enabled: false };
        }
        await requireWorkflowProvider().setEnabled({
          spaceId,
          request,
          workflowId: current.workflow_id,
          enabled: false,
        });
        return { enabled: false, workflow_id: current.workflow_id };
      }

      await install({ spaceId, aiIndexId });
      const installed = await getStatus({ spaceId, aiIndexId });
      if (!installed.workflow_id) {
        throw new FeedbackScheduleUnavailableError(
          `The improvement-loop workflow for AI index [${aiIndexId}] could not be installed.`
        );
      }

      // Enabling has to go through the workflows API on the caller's own request: that is what
      // stores their API key on the task, which is how the scheduled run ends up executing with
      // their privileges rather than none.
      await requireWorkflowProvider().setEnabled({
        spaceId,
        request,
        workflowId: installed.workflow_id,
        enabled: true,
      });
      return { enabled: true, workflow_id: installed.workflow_id };
    },

    async run({ spaceId, aiIndexId, request }) {
      const managedWorkflows = await requireManagedWorkflows();
      // A manual run must work whether or not the schedule is on, so it installs the instance
      // itself. Execution does not require the workflow to be enabled.
      await install({ spaceId, aiIndexId });

      return managedWorkflows.execute(request, CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID, {
        spaceId,
        workflowIdSuffix: buildFeedbackWorkflowSuffix(spaceId, aiIndexId),
        triggeredBy: 'manual',
      });
    },

    async uninstall({ spaceId, aiIndexId }) {
      try {
        const managedWorkflows = await getManagedWorkflows();
        await managedWorkflows?.uninstall(CONTEXT_ENGINE_IMPROVEMENT_LOOP_WORKFLOW_ID, {
          spaceId,
          workflowIdSuffix: buildFeedbackWorkflowSuffix(spaceId, aiIndexId),
        });
      } catch (error) {
        // The AI index is already gone by this point; failing the delete over its schedule would
        // leave the caller with no way forward.
        logger.warn(
          `Failed to uninstall the improvement-loop workflow for AI index [${aiIndexId}]: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    },
  };
};
