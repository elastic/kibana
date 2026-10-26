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
import {
  createSystemPrompt,
  createUserPrompt,
  createValidationFailureMessage,
} from './build_prompts';
import { isAgentStepAction, isToolResultAction, isValidateAction } from '../actions';
import type { StateType } from '../state';

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
    createUserMessage(
      createUserPrompt({
        nlQuery: state.nlQuery,
        additionalContext: state.additionalContext,
        workflowDefinition: state.workflowDefinition,
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
            currentWorkflowYaml: action.currentYaml,
            validation: action.validation,
          },
          wrapToolResult: false,
        })
      );
    } else if (isValidateAction(action) && !action.valid) {
      messages.push(createUserMessage(createValidationFailureMessage(action.errors)));
    }
  }

  return messages;
};
