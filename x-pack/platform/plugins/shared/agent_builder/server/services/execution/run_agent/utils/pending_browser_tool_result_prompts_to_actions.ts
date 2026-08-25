/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { ChatAgentEvent, ConversationRound, ToolResult } from '@kbn/agent-builder-common';
import {
  AgentPromptType,
  isBrowserToolResultPrompt,
  type BrowserToolResultPrompt,
  type BrowserToolResultPromptResponse,
  type PromptStorageState,
} from '@kbn/agent-builder-common/agents/prompts';
import { sanitizeToolId } from '@kbn/agent-builder-genai-utils/langchain';
import { createErrorResult, createOtherResult, getToolResultId } from '@kbn/agent-builder-server';
import { executeToolAction, toolCallAction, type ResearchAgentAction } from '../actions';
import { BROWSER_TOOL_PREFIX } from '../constants';
import type { ProcessedConversationRound } from './prepare_conversation';

/**
 * Convert pending `browser_tool_result` prompts + client responses into research actions.
 */
export const pendingBrowserToolResultPromptsToActions = async ({
  round,
  promptState,
}: {
  round: ConversationRound | ProcessedConversationRound;
  promptState: PromptStorageState;
  /** Unused today; kept for parity with ask_user helper signature / future events. */
  eventEmitter?: (event: ChatAgentEvent) => void;
  attachments?: unknown;
}): Promise<{ actions: ResearchAgentAction[]; consumedPromptIds: string[] }> => {
  const actions: ResearchAgentAction[] = [];
  const consumedPromptIds: string[] = [];

  const pendingPrompts = (round.pending_prompts ?? []).filter(isBrowserToolResultPrompt);

  for (const prompt of pendingPrompts) {
    const stored = promptState.responses[prompt.id];
    if (!stored || stored.type !== AgentPromptType.browser_tool_result) {
      throw new Error(
        `No browser_tool_result response found in prompt state for prompt_id ${prompt.id}`
      );
    }

    const response = stored.response;
    const { toolCallId, toolName, args, content, artifact } = materializeBrowserToolResult({
      prompt,
      response,
    });

    actions.push(toolCallAction({ toolCalls: [{ toolName, toolCallId, args }] }));
    actions.push(
      executeToolAction({
        toolResults: [{ toolCallId, content, artifact }],
      })
    );

    consumedPromptIds.push(prompt.id);
  }

  return { actions, consumedPromptIds };
};

const materializeBrowserToolResult = ({
  prompt,
  response,
}: {
  prompt: BrowserToolResultPrompt;
  response: BrowserToolResultPromptResponse;
}): {
  toolCallId: string;
  toolName: string;
  args: Record<string, unknown>;
  content: string;
  artifact: { results: ToolResult[] };
} => {
  const toolCallId = prompt.tool_call_id || uuidv4();
  const toolName = sanitizeToolId(`${BROWSER_TOOL_PREFIX}${prompt.tool_id}`);
  const args = prompt.params ?? {};

  if (!response.ok) {
    const errorMessage = response.error ?? 'Browser tool execution failed';
    const results = [createErrorResult(errorMessage)];
    return {
      toolCallId,
      toolName,
      args,
      content: JSON.stringify({ results }),
      artifact: { results },
    };
  }

  const results: ToolResult[] =
    response.results && response.results.length > 0
      ? response.results.map(
          (result): ToolResult =>
            ({
              ...result,
              tool_result_id: result.tool_result_id ?? getToolResultId(),
            } as ToolResult)
        )
      : [
          createOtherResult({
            message: `Browser tool '${prompt.tool_id}' completed successfully`,
          }),
        ];

  return {
    toolCallId,
    toolName,
    args,
    content: JSON.stringify({ results }),
    artifact: { results },
  };
};
