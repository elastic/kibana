/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BeforeAgentHookContext,
  HookHandlerResult,
  HookLifecycle,
} from '@kbn/agent-builder-server';
import {
  createWorkflowAbortedError,
  createWorkflowExecutionError,
  AGENT_WORKFLOWS_FEATURE_FLAG,
} from '@kbn/agent-builder-common';
import { ExecutionStatus, WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import type { Logger } from '@kbn/logging';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { InternalStartServices } from '../../services/types';
import { getCurrentSpaceId } from '../../utils/spaces';
import { executeWorkflow } from '../../services/workflow/execute_workflow';
import type { BeforeAgentWorkflowOutput } from './types';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

export interface RunBeforeAgentWorkflowsParams {
  context: BeforeAgentHookContext;
  workflowApi: WorkflowApi;
  getInternalServices: () => InternalStartServices;
  logger: Logger;
}

/**
 * Normalizes workflow output: when the engine returns a single-element array
 * (e.g. from a step inside an if/foreach), returns that element as an object.
 */
function normalizeWorkflowOutput(output: unknown): unknown {
  if (
    Array.isArray(output) &&
    output.length === 1 &&
    typeof output[0] === 'object' &&
    output[0] !== null
  ) {
    return output[0];
  }
  return output;
}

function isBeforeAgentWorkflowOutput(value: unknown): value is BeforeAgentWorkflowOutput {
  return typeof value === 'object' && value !== null;
}

/**
 * Runs the agent's configured before-agent workflows in sequence, updating the
 * round input when a workflow returns `new_prompt`. Throws on workflow failure
 * or when a workflow aborts the agent.
 *
 * @returns Updated nextInput when any workflow returned `new_prompt`, otherwise undefined
 */
export async function runBeforeAgentWorkflows({
  context,
  workflowApi,
  getInternalServices,
  logger,
}: RunBeforeAgentWorkflowsParams): Promise<void | HookHandlerResult<HookLifecycle.beforeAgent>> {
  if (!context.agentId) {
    return;
  }

  const { agents, spaces, featureFlags, uiSettings, savedObjects } = getInternalServices();
  const agentWorkflowsEnabled = await featureFlags.getBooleanValue(
    AGENT_WORKFLOWS_FEATURE_FLAG,
    false
  );
  const soClient = savedObjects.getScopedClient(context.request);
  const uiSettingsClient = uiSettings.asScopedToClient(soClient);
  const workflowsUiEnabled =
    (await uiSettingsClient.get<boolean>(WORKFLOWS_UI_SETTING_ID)) ?? false;
  if (!agentWorkflowsEnabled || !workflowsUiEnabled) {
    return;
  }

  const registry = await agents.getRegistry({ request: context.request });
  const agent = await registry.get(context.agentId);
  const workflowIds = agent?.configuration?.workflow_ids;

  if (!workflowIds?.length) {
    return;
  }

  const spaceId = getCurrentSpaceId({ request: context.request, spaces });
  let currentNextInput = context.nextInput;

  for (const workflowId of workflowIds) {
    const result = await executeWorkflow({
      workflowId,
      workflowParams: { prompt: currentNextInput.message ?? '' },
      request: context.request,
      spaceId,
      workflowApi,
      waitForCompletion: true,
    });

    if (!result.success) {
      throw createWorkflowExecutionError(result.error, { workflow: workflowId });
    }

    const execution = result.execution;
    if (execution.status === ExecutionStatus.FAILED) {
      const workflowName = execution.workflow_name ?? execution.workflow_id;
      const errorMessage = execution.error_message ?? `Workflow "${workflowName}" failed`;

      throw createWorkflowExecutionError(errorMessage, { workflow: workflowName });
    }

    logger.debug(
      `Workflow execution finished: ${execution.workflow_id} (${execution.execution_id})`
    );

    const rawOutput = normalizeWorkflowOutput(execution.output);
    if (!isBeforeAgentWorkflowOutput(rawOutput)) {
      continue;
    }

    const output: BeforeAgentWorkflowOutput = rawOutput;

    if (output.new_prompt) {
      currentNextInput = { ...currentNextInput, message: output.new_prompt };
    }

    if (output.abort || output.abort_message) {
      const workflow = execution.workflow_name ?? execution.workflow_id;
      throw createWorkflowAbortedError(
        output.abort_message ?? `Workflow "${workflow}" aborted the agent execution.`,
        { workflow }
      );
    }
  }

  if (currentNextInput !== context.nextInput) {
    return { nextInput: currentNextInput };
  }
}
