/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import apm from 'elastic-apm-node';
import type { Logger } from '@kbn/core/server';
import type { EsWorkflowExecution } from '@kbn/workflows';
import type { FailedStepContext } from '../workflow_context_manager/workflow_execution_state';

const LOG_MESSAGE = 'Workflow execution failed';

/**
 * Makes a workflow execution that ended in FAILED observable from platform logs and traces.
 *
 * A FAILED execution is recorded in the execution document, but the Task Manager task that ran it
 * completes normally, so neither task-run metrics, APM outcomes nor server logs say that it
 * failed or which workflow it was. This emits one structured log line and labels the current
 * (Task Manager) transaction so SREs can alert on failures of specific managed workflows.
 *
 * Workflow ids and step ids are only included for managed (Elastic-authored) workflows; for user
 * workflows they are user-chosen and are left out. Error messages are never included, only the
 * error type, since messages can embed user data.
 *
 * Logged at `warn` so user-owned failures do not count as plugin errors in the existing
 * `plugins.workflowsExecutionEngine` ERROR alerts. Filter on the message and `isManaged` /
 * `originManagedWorkflowId` to alert on specific managed workflows.
 */
export function logWorkflowExecutionFailure({
  logger,
  execution,
  failedStepContext,
}: {
  logger: Logger;
  execution: EsWorkflowExecution;
  failedStepContext?: FailedStepContext;
}): void {
  const isManaged = execution.managed === true;
  const originManagedWorkflowId = isManaged
    ? execution.originManagedWorkflowId ?? undefined
    : undefined;
  const failedStepId = isManaged ? failedStepContext?.stepId : undefined;

  const meta: Record<string, unknown> = {
    workflowRunId: execution.id,
    spaceId: execution.spaceId,
    isManaged,
    ...(isManaged ? { workflowId: execution.workflowId } : {}),
    ...(originManagedWorkflowId !== undefined ? { originManagedWorkflowId } : {}),
    ...(failedStepId !== undefined ? { failedStepId } : {}),
    errorType: execution.error?.type,
  };
  logger.warn(LOG_MESSAGE, meta);

  const transaction = apm.currentTransaction;
  if (transaction) {
    transaction.setLabel('workflow_outcome', 'failed');
    transaction.setLabel('is_managed_workflow', isManaged);
    if (isManaged) {
      transaction.setLabel('managed_workflow_id', originManagedWorkflowId ?? execution.workflowId);
      if (failedStepId !== undefined) {
        transaction.setLabel('workflow_failed_step_id', failedStepId);
      }
    }
  }
}
