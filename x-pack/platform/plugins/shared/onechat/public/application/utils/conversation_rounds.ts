/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type ConversationEvent,
  isAssistantMessage,
  isUserMessage,
  isToolResult,
  type ToolCall,
  type UserMessage,
  type AssistantMessage,
} from '../../../common/conversation_events';
import type { ProgressionEvent } from '../../../common/chat_events';
import type { ChatStatus } from '../hooks/use_chat';

export interface ConversationRoundToolCall {
  toolCall: ToolCall;
  toolResult?: string;
}

export interface ConversationRound {
  userMessage: UserMessage;
  assistantMessage?: AssistantMessage;
  toolCalls: ConversationRoundToolCall[];
  progressionEvents: ProgressionEvent[];
  loading: boolean;
}

export const getConversationRounds = ({
  conversationEvents,
  progressionEvents,
  chatStatus,
}: {
  conversationEvents: ConversationEvent[];
  progressionEvents: ProgressionEvent[];
  chatStatus: ChatStatus;
}): ConversationRound[] => {
  const toolCallMap = new Map<string, ConversationRoundToolCall>();
  const rounds: ConversationRound[] = [];

  let current: Partial<ConversationRound> | undefined;

  conversationEvents.forEach((item) => {
    if (isUserMessage(item)) {
      if (current?.userMessage) {
        throw new Error('chained user message');
      }
      if (!current) {
        current = {
          toolCalls: [],
          progressionEvents: [],
        };
      }
      current.userMessage = item;
    }
    if (isToolResult(item)) {
      const toolCallItem = toolCallMap.get(item.toolCallId);
      if (toolCallItem) {
        toolCallItem.toolResult = item.toolResult;
      }
    }
    if (isAssistantMessage(item)) {
      if (item.toolCalls.length) {
        item.toolCalls.forEach((toolCall) => {
          const roundToolCall = {
            toolCall,
          };
          current!.toolCalls!.push(roundToolCall);
          toolCallMap.set(toolCall.toolCallId, roundToolCall);
        });
      } else {
        current!.assistantMessage = item;
        rounds.push(current as ConversationRound);
        current = undefined;
      }
    }
  });

  if (current) {
    rounds.push(current as ConversationRound);
  }

  if (rounds.length > 0) {
    const lastRound = rounds[rounds.length - 1];

    if (progressionEvents) {
      lastRound.progressionEvents = progressionEvents;
    }

    if (chatStatus === 'loading') {
      lastRound.loading = true;
    }
  }

  return rounds;
};
