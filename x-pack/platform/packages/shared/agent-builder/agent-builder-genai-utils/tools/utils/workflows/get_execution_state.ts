/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonValue } from '@kbn/utility-types';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import { getWorkflowOutput } from './get_workflow_output';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

export interface WorkflowExecutionState {
  execution_id: string;
  status: ExecutionStatus;
  workflow_id: string;
  started_at: string;
  finished_at?: string;
  output?: JsonValue;
}

/**
 * Returns the state of a workflow execution.
 */
export const getExecutionState = async ({
  executionId,
  spaceId,
  workflowApi,
}: {
  executionId: string;
  spaceId: string;
  workflowApi: WorkflowApi;
}): Promise<WorkflowExecutionState | null> => {
  const execution = await workflowApi.getWorkflowExecution(executionId, spaceId);
  if (!execution) {
    return null;
  }

  const state: WorkflowExecutionState = {
    execution_id: executionId,
    status: execution.status,
    workflow_id: execution.workflowId ?? 'unknown',
    started_at: execution.startedAt,
    finished_at: execution.finishedAt,
  };

  if (execution.status === ExecutionStatus.COMPLETED) {
    state.output = getWorkflowOutput(execution.stepExecutions);
  }

  return state;
};
