/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  BaseMessage,
  ToolMessage,
  MessageContentComplex,
  isAIMessage,
} from '@langchain/core/messages';
import type { RunToolReturn } from '@kbn/onechat-server';

/**
 * Extract the text content from a langchain message or chunk.
 */
export const extractTextContent = (message: BaseMessage): string => {
  if (typeof message.content === 'string') {
    return message.content;
  } else {
    let content = '';
    for (const item of message.content as MessageContentComplex[]) {
      if (item.type === 'text') {
        content += item.text;
      }
    }
    return content;
  }
};

export interface ToolCall {
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
}

/**
 * Extracts the tool calls from a message.
 */
export const extractToolCalls = (message: BaseMessage): ToolCall[] => {
  if (isAIMessage(message)) {
    return (
      message.tool_calls?.map<ToolCall>((toolCall) => {
        if (!toolCall.id) {
          throw new Error('Tool call must have an id');
        }
        return {
          toolCallId: toolCall.id,
          toolName: toolCall.name,
          args: toolCall.args,
        };
      }) ?? []
    );
  }
  return [];
};

/**
 * Extract the structured tool return from a given tool message.
 * Note: this assumes the tool call was performed with the right configuration, so that
 * it was executed from a onechat agent.
 */
export const extractToolReturn = (message: ToolMessage): RunToolReturn => {
  if (!message.artifact) {
    throw new Error('No artifact attached to tool message');
  }
  if (!message.artifact.result) {
    throw new Error('No result attached to artifact');
  }

  return message.artifact as RunToolReturn;
};
