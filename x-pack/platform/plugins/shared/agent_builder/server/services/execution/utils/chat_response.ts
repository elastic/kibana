/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  createInternalError,
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
  isRoundCompleteEvent,
  type ChatEvent,
  type ConversationCreatedEvent,
  type ConversationUpdatedEvent,
} from '@kbn/agent-builder-common';
import type { ChatResponse } from '../../../../common/http_api/chat';

/** Recovers the conversation created/updated event that a conversation-mode run always emits*/
export const findConversationEvent = (
  events: ChatEvent[]
): ConversationCreatedEvent | ConversationUpdatedEvent => {
  const conversationEvent = events.find(
    (event): event is ConversationUpdatedEvent | ConversationCreatedEvent =>
      isConversationUpdatedEvent(event) || isConversationCreatedEvent(event)
  );
  if (!conversationEvent) {
    throw createInternalError('No conversation event was emitted by the agent run');
  }
  return conversationEvent;
};

export const buildChatResponseFromEvents = (events: ChatEvent[]): ChatResponse => {
  const roundCompleteEvent = events.find(isRoundCompleteEvent);
  if (!roundCompleteEvent) {
    throw createInternalError('No round_complete event was emitted by the agent run');
  }
  const conversationEvent = findConversationEvent(events);

  const {
    data: { round },
  } = roundCompleteEvent;
  const {
    data: { conversation_id: conversationId, access_control: accessControl },
  } = conversationEvent;

  return {
    conversation_id: conversationId,
    access_control: accessControl,
    round_id: round.id,
    ...omit(round, ['id', 'input', 'response', 'pending_prompts', 'state']),
    response: {
      ...round.response,
      prompts: round.pending_prompts,
    },
  };
};
