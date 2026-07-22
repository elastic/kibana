/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import {
  isConversationCreatedEvent,
  isConversationUpdatedEvent,
  isRoundCompleteEvent,
  type ChatEvent,
  type ConversationCreatedEvent,
  type ConversationUpdatedEvent,
} from '@kbn/agent-builder-common';
import type { ChatResponse } from '../../../../common/http_api/chat';

export const buildChatResponseFromEvents = (events: ChatEvent[]): ChatResponse => {
  const roundCompleteEvent = events.find(isRoundCompleteEvent);
  const conversationEvent = events.find(
    (event): event is ConversationUpdatedEvent | ConversationCreatedEvent =>
      isConversationUpdatedEvent(event) || isConversationCreatedEvent(event)
  );

  if (!roundCompleteEvent) {
    throw new Error('No round_complete event was emitted');
  }
  if (!conversationEvent) {
    throw new Error('No conversation event was emitted');
  }

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
