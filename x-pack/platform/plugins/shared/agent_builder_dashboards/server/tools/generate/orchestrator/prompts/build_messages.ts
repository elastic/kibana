/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { SystemMessage } from '@langchain/core/messages';
import {
  createUserMessage,
  createToolCallMessage,
  createToolResultMessage,
} from '@kbn/agent-builder-genai-utils/langchain';
import { createSystemPrompt, createUserPrompt } from './build_prompts';
import { isAgentStepAction, isToolResultAction } from '../actions';
import type { StateType } from '../state';

/**
 * Reconstruct the LangChain message list from the graph state's actions.
 *
 * The actions array is the single source of truth; this helper formats it
 * into the message shape expected by `chatModel.bindTools(...).invoke(...)`.
 *
 * Layout:
 *   1. SystemMessage  — base instructions + additionalInstructions
 *   2. HumanMessage   — request + additionalContext
 *   3. For each action, in order:
 *        - agent_step    → AIMessage (text + tool_calls)
 *        - tool_result   → ToolMessage (matching tool_call_id)
 */
export const buildMessagesFromActions = (state: StateType): BaseMessage[] => {
  const messages: BaseMessage[] = [];

  messages.push(
    new SystemMessage(
      createSystemPrompt({
        additionalInstructions: state.additionalInstructions,
      })
    )
  );

  messages.push(
    createUserMessage(
      createUserPrompt({
        request: state.request,
        additionalContext: state.additionalContext,
        existingDashboard: state.existingDashboard,
      })
    )
  );

  for (const action of state.actions) {
    if (isAgentStepAction(action)) {
      messages.push(createToolCallMessage(action.toolCalls, action.text));
    } else if (isToolResultAction(action)) {
      messages.push(
        createToolResultMessage({
          toolCallId: action.toolCallId,
          content: {
            success: action.success,
            error: action.error,
            data: action.data,
            currentDashboard: action.dashboardSummary,
            failures: action.failures,
          },
          wrapToolResult: false,
        })
      );
    }
  }

  return messages;
};
