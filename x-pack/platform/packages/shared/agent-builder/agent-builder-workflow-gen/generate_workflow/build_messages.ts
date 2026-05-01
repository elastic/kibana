/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseMessage } from '@langchain/core/messages';
import { AIMessage, HumanMessage, SystemMessage, ToolMessage } from '@langchain/core/messages';
import {
  createSystemPrompt,
  createUserPrompt,
  createValidationFailureMessage,
} from './prompts';
import { isAgentStepAction, isToolResultAction, isValidateAction } from './actions';
import type { StateType } from './state';

/**
 * Reconstruct the LangChain message list from the graph state's actions.
 *
 * The actions array is the single source of truth; this helper formats it
 * into the message shape expected by `chatModel.bindTools(...).invoke(...)`.
 *
 * Layout:
 *   1. SystemMessage  — built from prefetched context + additionalInstructions
 *   2. HumanMessage   — nlQuery + additionalContext
 *   3. For each action, in order:
 *        - agent_step    → AIMessage (text + tool_calls)
 *        - tool_result   → ToolMessage (matching tool_call_id)
 *        - validate(false) → HumanMessage with the failure prompt (re-prompts the agent)
 *        - validate(true)  → no message; the loop is about to terminate
 */
export const buildMessagesFromActions = (state: StateType): BaseMessage[] => {
  const messages: BaseMessage[] = [];

  messages.push(
    new SystemMessage(
      createSystemPrompt({
        prefetched: state.prefetched,
        additionalInstructions: state.additionalInstructions,
      })
    )
  );

  messages.push(
    new HumanMessage(
      createUserPrompt({
        nlQuery: state.nlQuery,
        additionalContext: state.additionalContext,
      })
    )
  );

  for (const action of state.actions) {
    if (isAgentStepAction(action)) {
      messages.push(
        new AIMessage({
          content: action.text ?? '',
          tool_calls: action.toolCalls.map((tc) => ({
            id: tc.toolCallId,
            name: tc.toolName,
            args: tc.args,
          })),
        })
      );
    } else if (isToolResultAction(action)) {
      messages.push(
        new ToolMessage({
          tool_call_id: action.toolCallId,
          name: action.name,
          content: JSON.stringify({
            success: action.success,
            ...(action.error !== undefined ? { error: action.error } : {}),
            ...(action.data !== undefined ? { data: action.data } : {}),
          }),
        })
      );
    } else if (isValidateAction(action) && !action.valid) {
      messages.push(new HumanMessage(createValidationFailureMessage(action.errors)));
    }
  }

  return messages;
};
