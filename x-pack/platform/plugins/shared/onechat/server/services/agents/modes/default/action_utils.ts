/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AIMessageChunk, BaseMessage } from '@langchain/core/messages';
import { isToolMessage } from '@langchain/core/messages';
import { extractTextContent, extractToolCalls } from '@kbn/onechat-genai-utils/langchain';
import type {
  ToolCallAction,
  HandoverAction,
  AgentErrorAction,
  ExecuteToolAction,
  AnswerAction,
} from './actions';
import { toolCallAction, handoverAction, executeToolAction, answerAction } from './actions';

export const processResearchResponse = (
  message: AIMessageChunk
): ToolCallAction | HandoverAction | AgentErrorAction => {
  if (message.tool_calls?.length) {
    return toolCallAction(extractToolCalls(message));
  } else {
    return handoverAction(extractTextContent(message));
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
  if (message.tool_calls?.length) {
    // TODO: error handling
  } else {
    return answerAction(extractTextContent(message));
  }
};
