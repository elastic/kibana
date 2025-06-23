/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage, isAIMessage } from '@langchain/core/messages';
import type { ToolCall as LangchainToolCall } from '@langchain/core/messages/tool';

export interface ToolCall {
  toolCallId: string;
  toolId: string;
  args: Record<string, any>;
}

export const getToolCalls = (message: BaseMessage): ToolCall[] => {
  if (isAIMessage(message)) {
    return message.tool_calls?.map(convertToolCall) ?? [];
  }
  return [];
};

const convertToolCall = (toolCall: LangchainToolCall): ToolCall => {
  if (!toolCall.id) {
    throw new Error('Tool call must have an id');
  }

  return {
    toolCallId: toolCall.id,
    toolId: toolCall.name,
    args: toolCall.args,
  };
};
