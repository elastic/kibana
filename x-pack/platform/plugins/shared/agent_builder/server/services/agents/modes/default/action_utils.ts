/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { isToolMessage } from '@langchain/core/messages';
import { extractTextContent, extractToolCalls } from '@kbn/agent-builder-genai-utils/langchain';
import { createAgentExecutionError } from '@kbn/agent-builder-common/base/errors';
import { AgentExecutionErrorCode } from '@kbn/agent-builder-common/agents';
import type { ToolHandlerPromptReturn, ToolHandlerReturn } from '@kbn/agent-builder-server/tools';
import { isToolHandlerInterruptReturn } from '@kbn/agent-builder-server/tools';
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
 * Create execute tool action based on the tool node result.
 */
export const processToolNodeResponse = (
  toolNodeResult: BaseMessage[]
): ExecuteToolAction | ToolPromptAction => {
  const toolMessages = toolNodeResult.filter(isToolMessage);

  const interruptMessage = toolMessages.find((message) => {
    const result: ToolHandlerReturn | undefined = message.artifact;
    return result && isToolHandlerInterruptReturn(result);
  });

  if (interruptMessage) {
    const toolResult: ToolHandlerPromptReturn = interruptMessage.artifact;
    return toolPromptAction(interruptMessage.tool_call_id, toolResult.prompt);
  }

  return executeToolAction(
    toolMessages.map((msg) => {
      return {
        toolCallId: msg.tool_call_id,
        content: extractTextContent(msg),
        artifact: msg.artifact,
      };
    })
  );
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
