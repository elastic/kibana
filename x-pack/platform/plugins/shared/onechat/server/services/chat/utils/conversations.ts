/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { of, defer, shareReplay, forkJoin, switchMap, Observable } from 'rxjs';
import { type Conversation, type RoundCompleteEvent } from '@kbn/onechat-common';
import type { ConversationClient } from '../../conversation';
import { createConversationUpdatedEvent, createConversationCreatedEvent } from './events';

/**
 * Persist a new conversation and emit the corresponding event
 */
export const createConversation$ = ({
  agentId,
  conversationClient,
  title$,
  roundCompletedEvents$,
}: {
  agentId: string;
  conversationClient: ConversationClient;
  title$: Observable<string>;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
}) => {
  return forkJoin({
    title: title$,
    roundCompletedEvent: roundCompletedEvents$,
  }).pipe(
    switchMap(({ title, roundCompletedEvent }) => {
      return conversationClient.create({
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
  conversation$,
  title$,
  roundCompletedEvents$,
}: {
  title$: Observable<string>;
  conversation$: Observable<Conversation>;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
  conversationClient: ConversationClient;
}) => {
  return forkJoin({
    conversation: conversation$,
    title: title$,
    roundCompletedEvent: roundCompletedEvents$,
  }).pipe(
    switchMap(({ conversation, title, roundCompletedEvent }) => {
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

export const getConversation$ = ({
  agentId,
  conversationId,
  conversationClient,
}: {
  agentId: string;
  conversationId: string | undefined;
  conversationClient: ConversationClient;
}): Observable<Conversation> => {
  return defer(() => {
    if (conversationId) {
      return conversationClient.get(conversationId);
    } else {
      return of(placeholderConversation({ agentId }));
    }
  }).pipe(shareReplay());
};

const placeholderConversation = ({ agentId }: { agentId: string }): Conversation => {
  return {
    id: uuidv4(),
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
