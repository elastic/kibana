/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIMessageChunk, BaseMessage, ToolMessage } from '@langchain/core/messages';
import { isToolMessage } from '@langchain/core/messages';
import { extractTextContent, extractToolCalls } from '@kbn/agent-builder-genai-utils/langchain';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import type { ToolHandlerPromptReturn, ToolHandlerReturn } from '@kbn/agent-builder-server/tools';
import { isToolHandlerInterruptReturn } from '@kbn/agent-builder-server/tools';
import type { Logger } from '@kbn/logging';
import type {
  ToolCallAction,
  HandoverAction,
  AgentErrorAction,
  ExecuteToolAction,
  ToolPromptAction,
  AnswerAction,
  StructuredAnswerAction,
} from './actions';
import {
  toolCallAction,
  handoverAction,
  executeToolAction,
  toolPromptAction,
  answerAction,
  errorAction,
  structuredAnswerAction,
} from './actions';

export const processResearchResponse = (
  message: AIMessageChunk
): ToolCallAction | HandoverAction | AgentErrorAction => {
  if (message.tool_calls?.length) {
    return toolCallAction(extractToolCalls(message));
  } else {
    const textContent = extractTextContent(message);
    if (textContent) {
      return handoverAction(textContent);
    } else {
      return errorAction(
        createAgentExecutionError(
          'agent returned an empty response',
          AgentExecutionErrorCode.emptyResponse,
          {}
        )
      );
    }
  }
};

/**
 * Create execute tool action(s) based on the tool node result.
 *
 * When parallel tool calls are used and one tool triggers a HITL interrupt:
 * - Completed tools are returned as an `ExecuteToolAction`
 * - The first interrupted tool is returned as a `ToolPromptAction`
 *
 * NOTE: If multiple tools trigger HITL in the same batch, only the first
 * interrupt is handled. The others are discarded. This is an accepted
 * limitation for the first iteration of parallel tool call support.
 */
export const processToolNodeResponse = (
  toolNodeResult: BaseMessage[],
  { logger }: { logger?: Logger } = {}
): (ExecuteToolAction | ToolPromptAction)[] => {
  const toolMessages = toolNodeResult.filter(isToolMessage);

  const completedMessages: ToolMessage[] = [];
  const interruptMessages: ToolMessage[] = [];

  for (const msg of toolMessages) {
    const result: ToolHandlerReturn | undefined = msg.artifact;
    if (result && isToolHandlerInterruptReturn(result)) {
      interruptMessages.push(msg);
    } else {
      completedMessages.push(msg);
    }
  }

  const actions: (ExecuteToolAction | ToolPromptAction)[] = [];

  if (completedMessages.length > 0) {
    actions.push(
      executeToolAction(
        completedMessages.map((msg) => ({
          toolCallId: msg.tool_call_id,
          content: extractTextContent(msg),
          artifact: msg.artifact,
        }))
      )
    );
  }

  if (interruptMessages.length > 0) {
    const firstInterrupt = interruptMessages[0];
    const toolResult: ToolHandlerPromptReturn = firstInterrupt.artifact;
    actions.push(toolPromptAction(firstInterrupt.tool_call_id, toolResult.prompt));
    if (interruptMessages.length > 1) {
      logger?.warn(`[agent] Tool execution: Found multiple tool interrupts in the same batch.`);
    }
  }

  return actions;
};

export const processAnswerResponse = (message: AIMessageChunk): AnswerAction | AgentErrorAction => {
  // The answering agent should not call tools. Some models/providers can still emit tool calls
  // unexpectedly, so we treat that as a recoverable error and retry with an explicit tool-result
  // error message in the prompt history.
  if (message.tool_calls?.length) {
    const [firstToolCall] = extractToolCalls(message);
    const toolName = firstToolCall?.toolName ?? 'unknown';
    const toolArgs = firstToolCall?.args ?? {};

    return errorAction(
      createAgentExecutionError(
        `Answer agent attempted to call tool "${toolName}"`,
        AgentExecutionErrorCode.toolNotFound,
        { toolName, toolArgs }
      )
    );
  }

  const textContent = extractTextContent(message);
  if (textContent) {
    return answerAction(extractTextContent(message));
  } else {
    return errorAction(
      createAgentExecutionError(
        'agent returned an empty response',
        AgentExecutionErrorCode.emptyResponse,
        {}
      )
    );
  }
};

export const processStructuredAnswerResponse = (
  response: unknown
): StructuredAnswerAction | AnswerAction | AgentErrorAction => {
  try {
    if (response && typeof response === 'object') {
      const action = structuredAnswerAction(response);
      return action;
    } else if (typeof response === 'string') {
      return answerAction(response);
    } else {
      return errorAction(
        createAgentExecutionError(
          'agent returned an invalid structured response',
          AgentExecutionErrorCode.emptyResponse,
          {}
        )
      );
    }
  } catch (error) {
    return errorAction(
      createAgentExecutionError(
        `Error processing structured response: ${
          error instanceof Error ? error.message : String(error)
        }`,
        AgentExecutionErrorCode.emptyResponse,
        {}
      )
    );
  }
};
