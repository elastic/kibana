/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { ExecutionStatus as WorkflowExecutionStatus } from '@kbn/workflows/types/v1';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ToolHandlerResult } from '@kbn/agent-builder-server/tools';
import { ToolResultType } from '@kbn/agent-builder-common/tools';
import { getWorkflowOutput } from './get_workflow_output';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

const WORKFLOW_MAX_WAIT = 60_000;
const WORKFLOW_INITIAL_WAIT = 1000;
const WORKFLOW_CHECK_INTERVAL = 2_500;

export const executeWorkflow = async ({
  workflowId,
  workflowParams,
  request,
  spaceId,
  workflowApi,
}: {
  workflowId: string;
  workflowParams: Record<string, unknown>;
  request: KibanaRequest;
  spaceId: string;
  workflowApi: WorkflowApi;
}): Promise<ToolHandlerResult[]> => {
  const workflow = await workflowApi.getWorkflow(workflowId, spaceId);

  if (!workflow) {
    return [errorResult(`Workflow '${workflowId}' not found.`)];
  }
  if (!workflow.enabled) {
    return [errorResult(`Workflow '${workflowId}' is disabled and cannot be executed.`)];
  }
  if (!workflow.valid) {
    return [errorResult(`Workflow '${workflowId}' has validation errors and cannot be executed.`)];
  }
  if (!workflow.definition) {
    return [errorResult(`Workflow '${workflowId}' has no definition and cannot be executed.`)];
  }

  const executionId = await workflowApi.runWorkflow(
    {
      id: workflow.id,
      name: workflow.name,
      enabled: workflow.enabled,
      definition: workflow.definition,
      yaml: workflow.yaml,
    },
    spaceId,
    workflowParams,
    request
  );

  const waitStart = Date.now();
  await waitMs(WORKFLOW_INITIAL_WAIT);

  do {
    try {
      const execution = await workflowApi.getWorkflowExecution(executionId, spaceId);

      if (execution) {
        if (execution.status === WorkflowExecutionStatus.COMPLETED) {
          const output = getWorkflowOutput(execution.stepExecutions);

          const data: Record<string, any> = {
            execution_id: executionId,
            workflow_id: workflowId,
            status: execution.status,
            started_at: execution.startedAt,
            finished_at: execution.finishedAt,
            output,
          };

          return [
            {
              type: ToolResultType.other,
              data,
            },
          ];
        }
        if (execution.status === WorkflowExecutionStatus.FAILED) {
          return [
            {
              type: ToolResultType.error,
              data: {
                message: `Workflow "${workflow.name}" failed.`,
                metadata: {
                  workflow_id: workflowId,
                  execution_id: executionId,
                  execution_status: execution.status,
                },
              },
            },
          ];
        }
      }
    } catch (e) {
      // trap - we just keep waiting until timeout
    }

    await waitMs(WORKFLOW_CHECK_INTERVAL);
  } while (Date.now() - waitStart < WORKFLOW_MAX_WAIT);

  // timeout-ed waiting without completion or failure status
  return [
    errorResult(
      `Workflow '${workflowId}' executed but not completed after ${WORKFLOW_MAX_WAIT}ms.`
    ),
  ];
};

const errorResult = (error: string): ToolHandlerResult => {
  return {
    type: ToolResultType.error,
    data: {
      message: error,
    },
  };
};

const waitMs = async (durationMs: number) => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};
