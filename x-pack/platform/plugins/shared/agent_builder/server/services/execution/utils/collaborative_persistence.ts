/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Observable } from 'rxjs';
import { forkJoin, from, of, switchMap } from 'rxjs';
import type {
  ChatEvent,
  Conversation,
  ConversationAction,
  RoundCompleteEvent,
  UserIdAndName,
} from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { AttachmentVersionRef } from '@kbn/agent-builder-common/attachments';
import type { ConversationClient } from '../../conversation';
import { createUserMessageEvent } from '../../conversation/client/append_message';
import { createConversationUpdatedEvent } from './events';

export const appendHumanMessage$ = ({
  conversationClient,
  conversationId,
  message,
  attachment_refs,
}: {
  conversationClient: ConversationClient;
  conversationId: string;
  message: string;
  attachment_refs?: AttachmentVersionRef[];
}): Observable<ChatEvent> => {
  return from(
    conversationClient.appendMessage({
      conversationId,
      message,
      attachment_refs,
    })
  ).pipe(
    switchMap(({ conversation: updated }) => of(createConversationUpdatedEvent(updated)))
  );
};

export const updateCollaborativeConversation$ = ({
  conversation,
  conversationClient,
  title$,
  roundCompletedEvents$,
  currentUser,
  action,
}: {
  conversation: Conversation;
  conversationClient: ConversationClient;
  title$: Observable<string>;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
  currentUser: UserIdAndName;
  action?: ConversationAction;
}): Observable<ChatEvent> => {
  return forkJoin({
    title: title$,
    roundCompletedEvent: roundCompletedEvents$,
  }).pipe(
    switchMap(({ title, roundCompletedEvent }) => {
      const { round, conversation_state: conversationState } = roundCompletedEvent.data;
      const userEvent = createUserMessageEvent({
        id: `msg-${round.id}`,
        message: round.input.message,
        user: currentUser,
        attachment_refs: round.input.attachment_refs,
        timestamp: round.started_at,
      });

      const agentEvent = {
        id: round.id,
        timestamp: round.started_at,
        type: TimelineEventType.agentExecution as const,
        agent_id: conversation.agent_id,
        status: round.status,
        state: round.state,
        pending_prompts: round.pending_prompts,
        steps: round.steps,
        response: round.response,
        started_at: round.started_at,
        time_to_first_token: round.time_to_first_token,
        time_to_last_token: round.time_to_last_token,
        model_usage: round.model_usage,
        trace_id: round.trace_id,
        configuration_overrides: round.configuration_overrides,
      };

      let events = conversation.events ?? [];
      if (action === 'regenerate' || roundCompletedEvent.data.resumed) {
        events = events.slice(0, -2);
      }
      events = [...events, userEvent, agentEvent];

      return conversationClient.update({
        id: conversation.id,
        title,
        events,
        ...(conversationState !== undefined && { state: conversationState }),
        ...(roundCompletedEvent.data.attachments !== undefined && {
          attachments: roundCompletedEvent.data.attachments,
        }),
      });
    }),
    switchMap((updatedConversation) => of(createConversationUpdatedEvent(updatedConversation)))
  );
};
