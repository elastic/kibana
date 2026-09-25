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
  MODEL_CONTEXT_MAX_LENGTH,
  WORKFLOW_CONTEXT_RECALLED_ID_MAX_LENGTH,
  WORKFLOW_CONTEXT_RECALLED_IDS_MAX_COUNT,
  type WorkflowContext,
} from '@kbn/agent-builder-common';
import { AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS } from '@kbn/management-settings-ids';
import { ExecutionStatus, WORKFLOWS_UI_SETTING_ID } from '@kbn/workflows';
import type { Logger } from '@kbn/logging';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import type { IUiSettingsClient } from '@kbn/core/server';
import { executeWorkflow } from '@kbn/agent-builder-tools-base/workflows';
import type { InternalStartServices } from '../../services/types';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { BeforeAgentWorkflowOutput } from './types';
import type { AgentsServiceStart } from '../../services/agents';
import {
  mergePreExecutionWorkflowIds,
  toStringArray,
} from '../../../common/pre_execution_workflows';

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

const normalizeModelContext = (value: unknown): string | undefined => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const normalized = value.trim();
  return normalized ? normalized.slice(0, MODEL_CONTEXT_MAX_LENGTH) : undefined;
};

const normalizeWorkflowContext = (value: unknown): WorkflowContext | undefined => {
  if (typeof value !== 'object' || value === null || !('semantic_memory' in value)) {
    return undefined;
  }
  const semanticMemory = value.semantic_memory;
  if (
    typeof semanticMemory !== 'object' ||
    semanticMemory === null ||
    !('recalled_ids' in semanticMemory) ||
    !Array.isArray(semanticMemory.recalled_ids)
  ) {
    return undefined;
  }

  const recalledIds: string[] = [];
  const inputCount = Math.min(
    semanticMemory.recalled_ids.length,
    WORKFLOW_CONTEXT_RECALLED_IDS_MAX_COUNT
  );
  for (let index = 0; index < inputCount; index++) {
    const id = semanticMemory.recalled_ids[index];
    if (typeof id === 'string') {
      recalledIds.push(id.slice(0, WORKFLOW_CONTEXT_RECALLED_ID_MAX_LENGTH));
    }
  }

  return {
    semantic_memory: {
      recalled_ids: recalledIds,
    },
  };
};

const mergeWorkflowContexts = (
  previous: WorkflowContext | undefined,
  next: WorkflowContext
): WorkflowContext => {
  const recalledIds = [
    ...(previous?.semantic_memory.recalled_ids ?? []),
    ...next.semantic_memory.recalled_ids,
  ];
  return {
    semantic_memory: {
      recalled_ids: [...new Set(recalledIds)].slice(0, WORKFLOW_CONTEXT_RECALLED_IDS_MAX_COUNT),
    },
  };
};

/**
 * Runs the agent's configured before-agent workflows in sequence, updating the
 * round input when a workflow returns `new_prompt` and accumulating workflow context. Throws
 * on workflow failure or when a workflow aborts the agent.
 *
 * @returns Updated input and/or accumulated workflow context, otherwise undefined
 */
export async function runBeforeAgentWorkflows({
  context,
  workflowApi,
  getInternalServices,
  logger,
}: RunBeforeAgentWorkflowsParams): Promise<void | HookHandlerResult<HookLifecycle.beforeAgent>> {
  const { agents, spaces, uiSettings, savedObjects } = getInternalServices();
  const soClient = savedObjects.getScopedClient(context.request);
  const uiSettingsClient = uiSettings.asScopedToClient(soClient);
  const isEnabled = await isPreExecutionWorkflowEnabled(uiSettingsClient);

  if (!isEnabled) {
    return;
  }

  const workflowIds = await getWorkflowIds(uiSettingsClient, context, agents);
  if (!workflowIds.length) {
    return;
  }

  const spaceId = getCurrentSpaceId({ request: context.request, spaces });
  let currentNextInput = context.nextInput;
  let preExecutionWorkflow = context.preExecutionWorkflow;
  let nextInputChanged = false;

  for (const workflowId of workflowIds) {
    const result = await executeWorkflow({
      workflowId,
      workflowParams: {
        prompt: currentNextInput.message ?? '',
        ...(context.conversationId ? { conversation_id: context.conversationId } : {}),
        ...(context.agentId ? { agent_id: context.agentId } : {}),
      },
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
      nextInputChanged = true;
    }

    const modelContext = normalizeModelContext(output.model_context);
    if (modelContext) {
      const combinedModelContext = [preExecutionWorkflow?.model_context, modelContext]
        .filter((fragment): fragment is string => Boolean(fragment))
        .join('\n\n')
        .slice(0, MODEL_CONTEXT_MAX_LENGTH);
      preExecutionWorkflow = {
        ...preExecutionWorkflow,
        model_context: combinedModelContext,
      };
    }

    const workflowContext = normalizeWorkflowContext(output.workflow_context);
    if (workflowContext) {
      preExecutionWorkflow = {
        ...preExecutionWorkflow,
        workflow_context: mergeWorkflowContexts(
          preExecutionWorkflow?.workflow_context,
          workflowContext
        ),
      };
    }

    if (output.abort || output.abort_message) {
      const workflow = execution.workflow_name ?? execution.workflow_id;
      throw createWorkflowAbortedError(
        output.abort_message ?? `Workflow "${workflow}" aborted the agent execution.`,
        { workflow }
      );
    }
  }

  if (nextInputChanged || preExecutionWorkflow !== context.preExecutionWorkflow) {
    return {
      ...(nextInputChanged ? { nextInput: currentNextInput } : {}),
      ...(preExecutionWorkflow ? { preExecutionWorkflow } : {}),
    };
  }
}

async function isPreExecutionWorkflowEnabled(uiSettingsClient: IUiSettingsClient) {
  return (await uiSettingsClient.get<boolean>(WORKFLOWS_UI_SETTING_ID)) ?? true;
}

async function getWorkflowIds(
  uiSettingsClient: IUiSettingsClient,
  context: BeforeAgentHookContext,
  agents: AgentsServiceStart
) {
  const globalWorkflowIds = toStringArray(
    await uiSettingsClient.get(AGENT_BUILDER_PRE_PROMPT_WORKFLOW_IDS)
  );

  let agentWorkflowIds: string[] = [];
  if (context.agentId) {
    const registry = await agents.getRegistry({ request: context.request });
    const agent = await registry.get(context.agentId);
    const configuration = await agents.resolveAgentConfiguration({
      agent,
      request: context.request,
    });
    agentWorkflowIds = configuration.workflow_ids ?? [];
  }

  return mergePreExecutionWorkflowIds(globalWorkflowIds, agentWorkflowIds);
}
