/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AfterExecutionHookContext } from '@kbn/agent-builder-server';
import {
  ConversationRoundStatus,
  isToolCallStep,
  type ToolCallStep,
} from '@kbn/agent-builder-common';
import { WORKFLOWS_UI_SETTING_ID, ExecutionStatus } from '@kbn/workflows';
import type { Logger } from '@kbn/logging';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { executeWorkflow } from '@kbn/agent-builder-tools-base/workflows';
import type { InternalStartServices } from '../../services/types';
import { getCurrentSpaceId } from '../../utils/spaces';
import type { AfterExecutionWorkflowParams } from './types';

type WorkflowApi = WorkflowsServerPluginSetup['management'];

export interface RunAfterExecutionWorkflowsParams {
  context: AfterExecutionHookContext;
  workflowApi: WorkflowApi;
  getInternalServices: () => InternalStartServices;
  logger: Logger;
}

export const runAfterExecutionWorkflows = async ({
  context,
  workflowApi,
  getInternalServices,
  logger,
}: RunAfterExecutionWorkflowsParams): Promise<void> => {
  const workflowIds = context.agentConfiguration.post_execution_workflow_ids ?? [];
  if (!workflowIds.length) {
    return;
  }

  if (context.round.status !== ConversationRoundStatus.completed) {
    return;
  }

  const { spaces, uiSettings, savedObjects } = getInternalServices();
  const soClient = savedObjects.getScopedClient(context.request);
  const uiSettingsClient = uiSettings.asScopedToClient(soClient);
  const isEnabled = (await uiSettingsClient.get<boolean>(WORKFLOWS_UI_SETTING_ID)) ?? true;

  if (!isEnabled) {
    return;
  }

  const spaceId = getCurrentSpaceId({ request: context.request, spaces });
  const { round } = context;

  const toolCalls = round.steps.filter(isToolCallStep).map((step: ToolCallStep) => ({
    tool_id: step.tool_id,
    tool_call_id: step.tool_call_id,
    params: step.params as Record<string, unknown>,
  }));

  const workflowParams: AfterExecutionWorkflowParams = {
    prompt: round.input.message ?? '',
    response: round.response.message ?? '',
    round_id: round.id,
    ...(context.conversationId ? { conversation_id: context.conversationId } : {}),
    ...(context.agentId ? { agent_id: context.agentId } : {}),
    tool_calls: toolCalls,
  };

  for (const workflowId of workflowIds) {
    const result = await executeWorkflow({
      workflowId,
      workflowParams: workflowParams as unknown as Record<string, unknown>,
      request: context.request,
      spaceId,
      workflowApi,
      waitForCompletion: true,
    });

    if (!result.success) {
      logger.error(`Post-execution workflow "${workflowId}" failed to execute: ${result.error}`);
      continue;
    }

    const execution = result.execution;
    if (execution.status === ExecutionStatus.FAILED) {
      const workflowName = execution.workflow_name ?? execution.workflow_id;
      logger.error(
        `Post-execution workflow "${workflowName}" execution failed: ${
          execution.error_message ?? 'unknown error'
        }`
      );
      continue;
    }

    logger.debug(
      `Post-execution workflow execution finished: ${execution.workflow_id} (${execution.execution_id})`
    );
  }
};
