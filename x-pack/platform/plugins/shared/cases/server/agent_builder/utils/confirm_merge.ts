/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import { AgentExecutionMode } from '@kbn/agent-builder-common';
import {
  ConfirmationStatus,
  type ConfirmPromptDefinition,
} from '@kbn/agent-builder-common/agents/prompts';
import type { ToolHandlerContext, ToolHandlerReturn } from '@kbn/agent-builder-server';
import { createErrorResult } from '@kbn/agent-builder-server';

// TODO: move into @kbn/agent-builder-server with agent_builder_workflows' confirm_tool_call.ts,
// which this follows, so tools outside that plugin can share it.

/**
 * True when a user can answer a prompt. `ai.agent` steps run in conversation mode with
 * interactivity off, so the execution mode alone does not tell.
 */
export const hasLiveUser = ({ executionMode, interactivity }: ToolHandlerContext): boolean =>
  executionMode !== AgentExecutionMode.standalone && interactivity.enabled;

/** Short hash of what a prompt shows, so a changed merge asks again. */
export const hashPromptContent = (content: string): string =>
  createHash('sha256').update(content).digest('hex').slice(0, 16);

export const NO_USER_TO_CONFIRM_MESSAGE =
  'Merging cases needs a user to confirm it, and no user can confirm it in this run, so the cases were not merged.';

/**
 * Asks the user to confirm a merge an agent wants to make. Returns undefined when the merge can
 * go ahead: the user accepted, or the call does not come from an agent (direct tool API calls are
 * confirmed by their caller). An agent run with no user to ask is always refused, even when the
 * API is pre-approved, because a merge closes cases.
 */
export const confirmMerge = ({
  context,
  promptContent,
  prompt,
  declinedMessage,
}: {
  context: ToolHandlerContext;
  /** What the prompt shows; when it changes after the user answered, the user is asked again. */
  promptContent: string;
  prompt: Omit<ConfirmPromptDefinition, 'id'>;
  declinedMessage: string;
}): ToolHandlerReturn | undefined => {
  const { prompts, callContext } = context;
  if (callContext.callSource !== 'agent') {
    return undefined;
  }
  if (!hasLiveUser(context)) {
    return { results: [createErrorResult(NO_USER_TO_CONFIRM_MESSAGE)] };
  }

  const id = [callContext.toolId, callContext.toolCallId, hashPromptContent(promptContent)].join(
    '.'
  );
  const { status } = prompts.checkConfirmationStatus(id);
  if (status === ConfirmationStatus.accepted) {
    return undefined;
  }
  if (status === ConfirmationStatus.rejected) {
    return { results: [createErrorResult(declinedMessage)] };
  }

  return prompts.askForConfirmation({ id, ...prompt });
};
