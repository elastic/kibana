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
import type {
  ToolCallAction,
  HandoverAction,
  AgentErrorAction,
  ExecuteToolAction,
  AnswerAction,
} from './actions';
import {
  toolCallAction,
  handoverAction,
  executeToolAction,
  answerAction,
  errorAction,
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
export const processToolNodeResponse = (toolNodeResult: BaseMessage[]): ExecuteToolAction => {
  const toolMessages = toolNodeResult.filter(isToolMessage);
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
