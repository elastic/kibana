/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EsWorkflowExecution } from '@kbn/workflows';
import { ExecutionStatus, isTerminalStatus } from '@kbn/workflows';
import type {
  WorkflowExecutionFinishedData,
  WorkflowExecutionFinishedStatus,
} from '@kbn/workflows-topics';
import { publishWorkflowExecutionFinished } from './publish_workflow_execution_finished';

/**
 * Publishes a terminal execution. `written` is the repository write, merged over a document that
 * was not already terminal. Omit it when `execution` is the document that was stored.
 */
export const publishFinishedWorkflowExecution = async (
  execution: Partial<EsWorkflowExecution> | null | undefined,
  written?: Partial<EsWorkflowExecution>
): Promise<void> => {
  if (!execution) {
    return;
  }
  if (written && execution.status && isTerminalStatus(execution.status)) {
    return;
  }
  const data = toWorkflowExecutionFinishedData(written ? { ...execution, ...written } : execution);
  if (!data) {
    return;
  }
  await publishWorkflowExecutionFinished(data);
};

function toWorkflowExecutionFinishedData(
  execution: Partial<EsWorkflowExecution>
): WorkflowExecutionFinishedData | undefined {
  if (!execution.id || !execution.workflowId || !execution.spaceId || !execution.status) {
    return undefined;
  }
  const status = toFinishedStatus(execution.status);
  if (!status) {
    return undefined;
  }
  const finishedAt =
    present(execution.finishedAt) ?? present(execution.cancelledAt) ?? new Date().toISOString();

  const data: WorkflowExecutionFinishedData = {
    executionId: execution.id,
    workflowId: execution.workflowId,
    spaceId: execution.spaceId,
    status,
    finishedAt,
    // Saved-workflow runs leave this unset. Only an explicit test run sets true.
    isTestRun: execution.isTestRun === true,
  };
  if (execution.triggeredBy) {
    data.triggeredBy = execution.triggeredBy;
  }
  if (typeof execution.duration === 'number' && Number.isFinite(execution.duration)) {
    data.durationMs = execution.duration;
  }
  if (execution.error?.type) {
    data.errorType = execution.error.type;
  }
  return data;
}

function toFinishedStatus(status: ExecutionStatus): WorkflowExecutionFinishedStatus | undefined {
  switch (status) {
    case ExecutionStatus.COMPLETED:
      return 'completed';
    case ExecutionStatus.FAILED:
      return 'failed';
    case ExecutionStatus.CANCELLED:
      return 'cancelled';
    case ExecutionStatus.TIMED_OUT:
      return 'timed_out';
    case ExecutionStatus.SKIPPED:
      return 'skipped';
    default:
      return undefined;
  }
}

function present(value: string | undefined): string | undefined {
  return value && value.length > 0 ? value : undefined;
}
