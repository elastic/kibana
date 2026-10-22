/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentExecutionMode, isApiAutoApproved } from '@kbn/agent-builder-common';
import {
  ConfirmationStatus,
  type ConfirmPromptDefinition,
} from '@kbn/agent-builder-common/agents/prompts';
import type { ToolHandlerContext, ToolHandlerReturn } from '@kbn/agent-builder-server';
import { errorResult } from '@kbn/agent-builder-genai-utils/tools/utils/results';

/**
 * True when a user can answer a prompt. `ai.agent` steps run in conversation
 * mode with interactivity off, so the execution mode alone does not tell.
 */
export const hasLiveUser = ({ executionMode, interactivity }: ToolHandlerContext): boolean =>
  executionMode !== AgentExecutionMode.standalone && interactivity.enabled;

/**
 * Asks the user to confirm a tool call. Returns undefined when the call can go
 * ahead: no live user, an `auto_approved_apis` match on `api`, an accepted prompt,
 * or no prompt from `getPrompt`.
 */
export const confirmToolCall = async ({
  context,
  toolId,
  api,
  declinedMessage,
  getPrompt,
}: {
  context: ToolHandlerContext;
  toolId: string;
  /** The `execute_api` Kibana selector for the same operation. */
  api: string;
  declinedMessage: string;
  getPrompt: () => Promise<Omit<ConfirmPromptDefinition, 'id'> | undefined>;
}): Promise<ToolHandlerReturn | undefined> => {
  const { interactivity, prompts, callContext } = context;
  if (!hasLiveUser(context) || isApiAutoApproved({ interactivity, target: 'kibana', api })) {
    return undefined;
  }

  const id = `${toolId}.${callContext.toolCallId}`;
  const { status } = prompts.checkConfirmationStatus(id);
  if (status === ConfirmationStatus.accepted) {
    return undefined;
  }
  if (status === ConfirmationStatus.rejected) {
    return { results: [errorResult(declinedMessage)] };
  }

  const prompt = await getPrompt();
  return prompt && prompts.askForConfirmation({ id, ...prompt });
};
