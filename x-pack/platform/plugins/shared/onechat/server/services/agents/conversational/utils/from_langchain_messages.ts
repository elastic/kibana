/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { BaseMessage, MessageContentComplex, isAIMessage } from '@langchain/core/messages';
import type { ToolCall as LangchainToolCall } from '@langchain/core/messages/tool';
import { StructuredToolIdentifier } from '@kbn/onechat-common';
import { toolIdFromLangchain } from './tool_provider_to_langchain_tools';

export interface ToolCall {
  toolCallId: string;
  toolId: StructuredToolIdentifier;
  args: Record<string, any>;
}

export const getToolCalls = (message: BaseMessage): ToolCall[] => {
  if (isAIMessage(message)) {
    return message.tool_calls?.map(convertLangchainToolCall) ?? [];
  }
  return [];
};

const convertLangchainToolCall = (toolCall: LangchainToolCall): ToolCall => {
  if (!toolCall.id) {
    throw new Error('Tool call must have an id');
  }

  return {
    toolCallId: toolCall.id,
    toolId: toolIdFromLangchain(toolCall.name),
    args: toolCall.args,
  };
};

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
