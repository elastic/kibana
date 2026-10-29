/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
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

const getRefusedMessage = (api: string): string =>
  `This call needs a user to confirm it, and no user can confirm it in this run, so it was not made. ` +
  `To allow it, pre-approve the Kibana API "${api}" (or "workflows.*") in auto_approved_apis; ` +
  `in a workflow, set approvals.auto_approved_apis.kibana on the ai.agent step.`;

/** Short hash of the definition a prompt shows, for `confirmToolCall`'s `getPromptKey`. */
export const hashDefinition = (definition: string): string =>
  createHash('sha256').update(definition).digest('hex').slice(0, 16);

/**
 * Asks the user to confirm a tool call. Returns undefined when the call can go
 * ahead: an `auto_approved_apis` match on `api`, an accepted prompt, no prompt
 * from `getPrompt`, or no live user when the call does not come from an agent.
 *
 * With no live user, an agent call that needs confirmation is refused, as
 * `execute_api` does: an `ai.agent` step must grant `api` to allow it. MCP clients
 * and direct API calls are not refused; their caller confirms the call.
 */
export const confirmToolCall = async ({
  context,
  toolId,
  api,
  declinedMessage,
  getPromptKey,
  getPrompt,
}: {
  context: ToolHandlerContext;
  toolId: string;
  /** The `execute_api` Kibana selector for the same operation. */
  api: string;
  declinedMessage: string;
  /**
   * Identifies what the prompt shows, for example a hash of the workflow definition.
   * When it changes after the user answered, the user is asked again.
   */
  getPromptKey?: () => Promise<string | undefined>;
  getPrompt: () => Promise<Omit<ConfirmPromptDefinition, 'id'> | undefined>;
}): Promise<ToolHandlerReturn | undefined> => {
  const { interactivity, prompts, callContext } = context;
  if (isApiAutoApproved({ interactivity, target: 'kibana', api })) {
    return undefined;
  }
  if (!hasLiveUser(context)) {
    if (callContext.callSource !== 'agent') {
      return undefined;
    }
    const prompt = await getPrompt();
    return prompt && { results: [errorResult(getRefusedMessage(api))] };
  }

  const promptKey = await getPromptKey?.();
  const id = [toolId, callContext.toolCallId, promptKey].filter(Boolean).join('.');
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
