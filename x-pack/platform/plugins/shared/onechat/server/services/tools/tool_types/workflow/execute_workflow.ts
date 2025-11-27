/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { ExecutionStatus as WorkflowExecutionStatus } from '@kbn/workflows/types/v1';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { ToolHandlerResult } from '@kbn/onechat-server/tools';
import {
  getExecutionState,
  type WorkflowExecutionState,
} from '@kbn/onechat-genai-utils/tools/utils/workflows';
import { errorResult, otherResult } from '@kbn/onechat-genai-utils/tools/utils/results';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

const WORKFLOW_MAX_WAIT = 60_000;
const WORKFLOW_INITIAL_WAIT = 1000;
const WORKFLOW_CHECK_INTERVAL = 2_500;

const finalStatuses = [WorkflowExecutionStatus.COMPLETED, WorkflowExecutionStatus.FAILED];

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

  let execution: WorkflowExecutionState | null | undefined;
  do {
    try {
      execution = await getExecutionState({ executionId, spaceId, workflowApi });
      if (execution && finalStatuses.includes(execution.status)) {
        return [otherResult({ execution })];
      }
    } catch (e) {
      // trap - we just keep waiting until timeout
    }

    await waitMs(WORKFLOW_CHECK_INTERVAL);
  } while (Date.now() - waitStart < WORKFLOW_MAX_WAIT);

  if (execution) {
    return [otherResult({ execution })];
  } else {
    return [
      errorResult(
        `Workflow '${workflowId}' executed but not completed after ${WORKFLOW_MAX_WAIT}ms.`
      ),
    ];
  }

  // timeout-ed waiting without completion or failure status
};

const waitMs = async (durationMs: number) => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};
