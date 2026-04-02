/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, Logger } from '@kbn/core/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-plugin/common';
import { NonTerminalExecutionStatuses } from '@kbn/workflows';

import { TaskStatus } from '@kbn/streams-schema';
import { CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID } from '../../../common/constants';
import type { TaskClient } from '../tasks/task_client';
import { FEATURES_IDENTIFICATION_TASK_TYPE } from '../tasks/task_definitions/features_identification';
import WORKFLOW_YAML from './continuous_extraction_workflow.yaml';

export interface ContinuousKiExtractionWorkflowService {
  ensureWorkflow(params: {
    enabled: boolean;
    request: KibanaRequest;
    taskClient: TaskClient<string>;
  }): Promise<void>;
}

const pollUntil = async (
  predicate: () => Promise<boolean>,
  { intervalMs, maxMs }: { intervalMs: number; maxMs: number }
): Promise<boolean> => {
  const deadline = Date.now() + maxMs;
  while (Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    if (await predicate()) {
      return true;
    }
  }
  return false;
};

export const createContinuousKiExtractionWorkflowService = (
  logger: Logger,
  managementApi: WorkflowsServerPluginSetup['management']
): ContinuousKiExtractionWorkflowService => {
  const log = logger.get('continuous-ki-extraction-workflow');

  const getNonTerminalExecutions = async () => {
    const { results, total } = await managementApi.getWorkflowExecutions(
      {
        workflowId: CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
        statuses: [...NonTerminalExecutionStatuses],
        size: 1,
      },
      DEFAULT_SPACE_ID
    );
    return { results, total };
  };

  const cancelAndAwaitTermination = async () => {
    const { results } = await getNonTerminalExecutions();
    if (results.length === 0) {
      return;
    }

    const executionId = results[0].id;
    log.info(`Cancelling execution ${executionId}`);
    await managementApi.cancelWorkflowExecution(executionId, DEFAULT_SPACE_ID);

    const terminated = await pollUntil(async () => (await getNonTerminalExecutions()).total === 0, {
      intervalMs: 1000,
      maxMs: 30_000,
    });

    if (terminated) {
      log.debug(`Execution ${executionId} reached terminal state`);
    } else {
      log.warn(`Execution ${executionId} still running after 30s, proceeding anyway`);
    }
  };

  const cancelRunningTasks = async (taskClient: TaskClient<string>) => {
    const canceledIds = await taskClient.cancelByType(FEATURES_IDENTIFICATION_TASK_TYPE);
    if (canceledIds.length === 0) {
      return;
    }

    log.info(`Requested cancellation for ${canceledIds.length} running task(s), awaiting…`);

    const allTerminated = await pollUntil(
      async () => {
        const tasks = await Promise.all(canceledIds.map((id) => taskClient.get(id)));
        return tasks.every(
          (t) => t.status !== TaskStatus.InProgress && t.status !== TaskStatus.BeingCanceled
        );
      },
      { intervalMs: 1000, maxMs: 30_000 }
    );

    if (allTerminated) {
      log.debug('All feature-identification tasks reached terminal state');
    } else {
      log.warn('Some tasks did not terminate within 30s, proceeding anyway');
    }
  };

  const hardDelete = async (request: KibanaRequest) => {
    try {
      await cancelAndAwaitTermination();
    } catch (error) {
      log.warn(`Best-effort cancellation failed, proceeding with delete: ${error}`);
    }

    const { deleted, failures } = await managementApi.deleteWorkflows(
      [CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID],
      DEFAULT_SPACE_ID,
      request,
      { force: true }
    );

    if (deleted === 0 && failures.length > 0) {
      const reasons = failures.map((f) => `${f.id}: ${f.error}`).join('; ');
      throw new Error(
        `Failed to delete workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}: ${reasons}`
      );
    }

    log.info(`Hard-deleted workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`);
  };

  return {
    async ensureWorkflow({ enabled, request, taskClient }) {
      const existing = await managementApi.getWorkflow(
        CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID,
        DEFAULT_SPACE_ID
      );
      const currentlyEnabled = existing?.enabled ?? false;

      if (enabled === currentlyEnabled) {
        log.debug(`Workflow already ${enabled ? 'enabled' : 'disabled'}, no-op`);
        return;
      }

      if (existing) {
        await cancelRunningTasks(taskClient);
        await hardDelete(request);
      }

      if (!enabled) {
        return;
      }

      const purged = await taskClient.deleteByType(FEATURES_IDENTIFICATION_TASK_TYPE);
      if (purged > 0) {
        log.info(`Purged ${purged} feature-identification task(s) for clean-slate re-extraction`);
      }

      await managementApi.createWorkflow(
        { yaml: WORKFLOW_YAML, id: CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID },
        DEFAULT_SPACE_ID,
        request
      );

      log.info(`Created continuous KI extraction workflow ${CONTINUOUS_KI_EXTRACTION_WORKFLOW_ID}`);
    },
  };
};
