/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { ExecutionStatus, isTerminalStatus, type WorkflowExecutionDto } from '@kbn/workflows';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  INVESTIGATE_STEP_ID,
  investigationStateSchema,
  type InvestigationRunStatus,
} from '@kbn/significant-events-schema';

export const resolveStatusFromExecution = (
  execution: Pick<WorkflowExecutionDto, 'status' | 'stepExecutions'>
): InvestigationRunStatus => {
  if (!isTerminalStatus(execution.status)) {
    return 'pending';
  }

  /**
   * Retries and loops produce several step executions sharing one `stepId`, so the outcome is the
   * last attempt's — an earlier failure that was retried successfully must not win.
   */
  const stepExecution = (execution.stepExecutions ?? [])
    .filter((step) => step.stepId === INVESTIGATE_STEP_ID)
    .sort((a, b) => a.stepExecutionIndex - b.stepExecutionIndex)
    .at(-1);

  if (stepExecution?.error) {
    return 'failed';
  }

  const output = stepExecution?.output as { structured_output?: unknown } | undefined;
  if (investigationStateSchema.safeParse(output?.structured_output).success) {
    return 'complete';
  }

  if (execution.status !== ExecutionStatus.COMPLETED) {
    return 'failed';
  }

  /**
   * The execution completed but its structured output is not readable yet — the workflow engine
   * flushes step output shortly after the agent stream ends. Reporting `failed` here would make a
   * successful run briefly look broken, so it stays `pending` until the output lands.
   */
  return 'pending';
};

/**
 * Resolves the outcome of each investigation run from its workflow execution, which is the source
 * of truth. Unknown or unreadable executions are omitted rather than reported as failures, so a
 * caller can tell "this run failed" apart from "I could not find out".
 */
export const resolveInvestigationStatuses = async ({
  workflowsManagement,
  spaceId,
  workflowExecutionIds,
  logger,
}: {
  workflowsManagement?: WorkflowsServerPluginSetup;
  spaceId: string;
  workflowExecutionIds: string[];
  logger: Logger;
}): Promise<Record<string, InvestigationRunStatus>> => {
  if (!workflowsManagement) {
    logger.debug('Workflows management not available, cannot resolve investigation statuses');
    return {};
  }

  const uniqueIds = [...new Set(workflowExecutionIds.filter(Boolean))];

  const entries = await Promise.all(
    uniqueIds.map(async (id) => {
      try {
        const execution = await workflowsManagement.management.getWorkflowExecution(id, spaceId, {
          includeOutput: true,
        });
        return execution ? ([id, resolveStatusFromExecution(execution)] as const) : undefined;
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        logger.debug(
          `Could not resolve investigation status for workflow execution "${id}": ${reason}`
        );
        return undefined;
      }
    })
  );

  return Object.fromEntries(entries.filter((entry) => entry != null));
};
