/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ConversationRound } from '@kbn/agent-builder-common';
import type { PromptStorageState } from '@kbn/agent-builder-common/agents/prompts';
import { AgentPromptType, isBrowserToolCallPrompt } from '@kbn/agent-builder-common/agents/prompts';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import { toolCallAction, executeToolAction } from '../actions';
import type { ResearchAgentAction } from '../actions';
import { BROWSER_TOOL_PREFIX } from '../constants';
import type { ProcessedConversationRound } from './prepare_conversation';

/**
 * Convert the pending browser tool call prompts + corresponding responses to a list of actions,
 * for execution resuming.
 *
 * Browser tool calls interrupt the execution instead of returning a result, so the tool call
 * never made it into the LLM message history. Here we materialize the call and the result the
 * browser reported back, so that on resume the model sees a plain tool call / tool result pair.
 */
export const pendingBrowserToolPromptsToActions = ({
  round,
  promptState,
}: {
  round: ConversationRound | ProcessedConversationRound;
  promptState: PromptStorageState;
}): { actions: ResearchAgentAction[]; consumedPromptIds: string[] } => {
  const actions: ResearchAgentAction[] = [];
  const consumedPromptIds: string[] = [];

  const pendingPrompts = (round.pending_prompts ?? []).filter(isBrowserToolCallPrompt);

  for (const prompt of pendingPrompts) {
    const stored = promptState.responses[prompt.id];
    if (!stored || stored.type !== AgentPromptType.browser_tool_call) {
      throw new Error(
        `No browser_tool_call response found in prompt state for prompt_id ${prompt.id}`
      );
    }
    const { result, error } = stored.response;

    const toolCallId = uuidv4();
    const toolName = sanitizeToolId(`${BROWSER_TOOL_PREFIX}${prompt.tool_id}`);

    actions.push(toolCallAction({ toolCalls: [{ toolName, toolCallId, args: prompt.params }] }));
    actions.push(
      executeToolAction({
        toolResults: [
          {
            toolCallId,
            content: error !== undefined ? JSON.stringify({ error }) : result ?? 'null',
          },
        ],
      })
    );

    consumedPromptIds.push(prompt.id);
  }

  return { actions, consumedPromptIds };
};
