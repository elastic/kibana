/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ConversationRound, toStructuredToolIdentifier } from '@kbn/onechat-common';
import { createToolCallStep } from '@kbn/onechat-common/chat/conversation';
import {
  type ConversationEvent,
  isAssistantMessage,
  isUserMessage,
  isToolResult,
  type ToolCall,
} from '../../../common/conversation_events';

export interface ConversationRoundToolCall {
  toolCall: ToolCall;
  toolResult?: string;
}

export const getConversationRounds = ({
  conversationEvents,
}: {
  conversationEvents: ConversationEvent[];
}): ConversationRound[] => {
  const toolCallMap = new Map<string, ConversationRoundToolCall>();
  const rounds: ConversationRound[] = [];

  let current: Partial<ConversationRound> | undefined;

  conversationEvents.forEach((item) => {
    if (isUserMessage(item)) {
      if (current?.userInput) {
        throw new Error('chained user message');
      }
      if (!current) {
        current = {
          steps: [],
        };
      }
      current.userInput = { message: item.content };
    }
    if (isToolResult(item)) {
      const toolCallItem = toolCallMap.get(item.toolCallId);
      if (toolCallItem) {
        toolCallItem.toolResult = item.toolResult;
      }
    }
    if (isAssistantMessage(item)) {
      if (item.toolCalls.length > 0) {
        item.toolCalls.forEach((toolCall) => {
          const { toolCallId, toolName, args } = toolCall;
          current!.steps!.push(
            createToolCallStep({
              toolCallId,
              toolId: toStructuredToolIdentifier(toolName),
              args,
              result: '',
            })
          );
          toolCallMap.set(toolCallId, { toolCall });
        });
      } else {
        current!.assistantResponse = { message: item.content };
        rounds.push(current as ConversationRound);
        current = undefined;
      }
    }
  });

  if (current) {
    rounds.push(current as ConversationRound);
  }

  return rounds;
};
