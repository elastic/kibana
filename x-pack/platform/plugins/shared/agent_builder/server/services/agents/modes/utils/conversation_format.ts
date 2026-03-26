/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Conversation,
  ExecutionConversation,
  ConversationRound,
} from '@kbn/agent-builder-common';
import { timelineEventsToRounds } from '@kbn/agent-builder-common';

/**
 * Type guard to check if a conversation is an ExecutionConversation (timeline-based).
 */
export const isExecutionConversation = (
  conversation: Conversation | ExecutionConversation
): conversation is ExecutionConversation => {
  return 'timeline' in conversation;
};

/**
 * Extracts rounds from a conversation, regardless of format.
 * If the conversation is timeline-based, converts timeline events to rounds.
 */
export const getRoundsFromConversation = (
  conversation?: Conversation | ExecutionConversation
): ConversationRound[] => {
  if (!conversation) {
    return [];
  }
  if (isExecutionConversation(conversation)) {
    return timelineEventsToRounds(conversation.timeline);
  }
  return conversation.rounds;
};
