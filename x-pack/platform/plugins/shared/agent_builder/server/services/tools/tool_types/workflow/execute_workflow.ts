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
import { WAIT_FOR_COMPLETION_TIMEOUT_SEC } from '@kbn/agent-builder-common/tools/types/workflow';
import {
  getExecutionState,
  type WorkflowExecutionState,
} from '@kbn/agent-builder-genai-utils/tools/utils/workflows';
import { errorResult, otherResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

const INITIAL_WAIT_MS = 1_000;
const CHECK_INTERVAL_MS = 2_500;

const finalStatuses = [WorkflowExecutionStatus.COMPLETED, WorkflowExecutionStatus.FAILED];

export const executeWorkflow = async ({
  workflowId,
  workflowParams,
  request,
  spaceId,
  workflowApi,
  waitForCompletion = true,
  completionTimeoutSec = WAIT_FOR_COMPLETION_TIMEOUT_SEC,
}: {
  workflowId: string;
  workflowParams: Record<string, unknown>;
  waitForCompletion?: boolean;
  completionTimeoutSec?: number;
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

  const waitLimit = Date.now() + completionTimeoutSec * 1000;
  await waitMs(INITIAL_WAIT_MS);

  let execution: WorkflowExecutionState | null | undefined;
  do {
    try {
      execution = await getExecutionState({ executionId, spaceId, workflowApi });

      const shouldReturn = waitForCompletion
        ? execution && finalStatuses.includes(execution.status)
        : execution;

      if (shouldReturn) {
        return [otherResult({ execution })];
      }
    } catch (e) {
      // trap - we just keep waiting until timeout
    }

    await waitMs(CHECK_INTERVAL_MS);
  } while (Date.now() < waitLimit);

  if (execution) {
    return [otherResult({ execution })];
  } else {
    return [
      errorResult(
        `Workflow '${workflowId}' executed but execution not found after ${WAIT_FOR_COMPLETION_TIMEOUT_SEC}s.`
      ),
    ];
  }
};

const waitMs = async (durationMs: number) => {
  await new Promise((resolve) => setTimeout(resolve, durationMs));
};
