/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Observable } from 'rxjs';
import { of, forkJoin, switchMap } from 'rxjs';
import { type Conversation, type RoundCompleteEvent } from '@kbn/onechat-common';
import type { ConversationClient } from '../../conversation';
import { createConversationUpdatedEvent, createConversationCreatedEvent } from './events';

/**
 * Persist a new conversation and emit the corresponding event
 */
export const createConversation$ = ({
  agentId,
  conversationClient,
  conversationId,
  title$,
  roundCompletedEvents$,
}: {
  agentId: string;
  conversationClient: ConversationClient;
  conversationId?: string;
  title$: Observable<string>;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
}) => {
  return forkJoin({
    title: title$,
    roundCompletedEvent: roundCompletedEvents$,
  }).pipe(
    switchMap(({ title, roundCompletedEvent }) => {
      return conversationClient.create({
        id: conversationId,
        title,
        agent_id: agentId,
        rounds: [roundCompletedEvent.data.round],
      });
    }),
    switchMap((createdConversation) => {
      return of(createConversationCreatedEvent(createdConversation));
    })
  );
};

/**
 * Update an existing conversation and emit the corresponding event
 */
export const updateConversation$ = ({
  conversationClient,
  conversation,
  title$,
  roundCompletedEvents$,
}: {
  conversation: Conversation;
  title$: Observable<string>;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
  conversationClient: ConversationClient;
}) => {
  return forkJoin({
    title: title$,
    roundCompletedEvent: roundCompletedEvents$,
  }).pipe(
    switchMap(({ title, roundCompletedEvent }) => {
      return conversationClient.update({
        id: conversation.id,
        title,
        rounds: [...conversation.rounds, roundCompletedEvent.data.round],
      });
    }),
    switchMap((updatedConversation) => {
      return of(createConversationUpdatedEvent(updatedConversation));
    })
  );
};

/**
 * Check if a conversation exists
 */
export const conversationExists = async ({
  conversationId,
  conversationClient,
}: {
  conversationId: string;
  conversationClient: ConversationClient;
}): Promise<boolean> => {
  return conversationClient.exists(conversationId);
};

export type ConversationOperation = 'CREATE' | 'UPDATE';

export type ConversationWithOperation = Conversation & { operation: ConversationOperation };

/**
 * Get a conversation by ID, or create a placeholder for new conversations
 * Also determines the operation type (CREATE or UPDATE) based on the same logic
 */
export const getConversation = async ({
  agentId,
  conversationId,
  autoCreateConversationWithId = false,
  conversationClient,
}: {
  agentId: string;
  conversationId: string | undefined;
  autoCreateConversationWithId?: boolean;
  conversationClient: ConversationClient;
}): Promise<ConversationWithOperation> => {
  // Case 1: No conversation ID - create new with placeholder
  if (!conversationId) {
    return {
      ...placeholderConversation({ agentId }),
      operation: 'CREATE',
    };
  }

  // Case 2: Conversation ID specified and autoCreate is false - update existing
  if (!autoCreateConversationWithId) {
    return {
      ...(await conversationClient.get(conversationId)),
      operation: 'UPDATE',
    };
  }

  // Case 3: Conversation ID specified and autoCreate is true - check if exists
  const exists = await conversationExists({ conversationId, conversationClient });
  if (exists) {
    return {
      ...(await conversationClient.get(conversationId)),
      operation: 'UPDATE',
    };
  } else {
    return {
      ...placeholderConversation({ conversationId, agentId }),
      operation: 'CREATE',
    };
  }
};

export const placeholderConversation = ({
  agentId,
  conversationId,
}: {
  agentId: string;
  conversationId?: string;
}): Conversation => {
  return {
    id: conversationId ?? uuidv4(),
    title: 'New conversation',
    agent_id: agentId,
    rounds: [],
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    user: {
      id: 'unknown',
      username: 'unknown',
    },
  };
};
