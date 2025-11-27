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

const DEFAULT_WAIT_FOR = 60;
const DEFAULT_INITIAL_WAIT = 1;
const DEFAULT_CHECK_INTERVAL = 2.5;

const finalStatuses = [WorkflowExecutionStatus.COMPLETED, WorkflowExecutionStatus.FAILED];

export const executeWorkflow = async ({
  workflowId,
  workflowParams,
  request,
  spaceId,
  workflowApi,
  waitFor = DEFAULT_WAIT_FOR,
  initialWait = DEFAULT_INITIAL_WAIT,
  checkInterval = DEFAULT_CHECK_INTERVAL,
}: {
  workflowId: string;
  workflowParams: Record<string, unknown>;
  waitFor?: number;
  initialWait?: number;
  checkInterval?: number;
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
  const waitLimit = waitStart + waitFor * 1000;

  await waitMs(initialWait * 1000);

  let execution: WorkflowExecutionState | null | undefined;
  do {
    try {
      execution = await getExecutionState({ executionId, spaceId, workflowApi });
      // if final status is reached, return result directly
      if (execution && finalStatuses.includes(execution.status)) {
        return [otherResult({ execution })];
      }
    } catch (e) {
      // trap - we just keep waiting until timeout
    }

    await waitMs(checkInterval * 1000);
  } while (Date.now() < waitLimit);

  if (execution) {
    return [otherResult({ execution })];
  } else {
    return [
      errorResult(`Workflow '${workflowId}' executed but execution not found after ${waitFor}s.`),
    ];
  }
};

const waitMs = async (durationMs: number) => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};
