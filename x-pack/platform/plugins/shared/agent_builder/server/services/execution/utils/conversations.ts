/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Observable } from 'rxjs';
import { of, forkJoin, switchMap } from 'rxjs';
import type {
  Conversation,
  ConversationAccessControl,
  ConversationOrigin,
  RoundCompleteEvent,
  ConversationAction,
} from '@kbn/agent-builder-common';
import {
  ConversationParentRelation,
  normalizeConversationAccessControl,
} from '@kbn/agent-builder-common';
import type { ConversationClient } from '../../conversation';
import { createConversationUpdatedEvent, createConversationCreatedEvent } from './events';

/**
 * Persist a new conversation and emit the corresponding event
 */
export const createConversation$ = ({
  conversation,
  conversationClient,
  title$,
  roundCompletedEvents$,
}: {
  conversation: Pick<
    Conversation,
    'id' | 'agent_id' | 'access_control' | 'origin' | 'user' | 'parent_conversation_id'
  >;
  conversationClient: ConversationClient;
  title$: Observable<string>;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
}) => {
  return forkJoin({
    title: title$,
    roundCompletedEvent: roundCompletedEvents$,
  }).pipe(
    switchMap(({ title, roundCompletedEvent }) => {
      // Persistent sub-agent creations: link to the parent and snapshot the
      // parent's user when it was resolved (see `getConversation` Case 3a).
      //
      // Guard: `placeholderConversation` always sets `user` to the
      // `PLACEHOLDER_USER` sentinel; forwarding that as a user override would
      // persist the child with `user_id: 'unknown'` and lock the driver out on
      // subsequent access. Only forward `user` when it's been intentionally
      // set to a real value (i.e. NOT the sentinel).
      const isPersistentSubagentCreate = Boolean(conversation.parent_conversation_id);
      const hasResolvedParentUser =
        Boolean(conversation.user) && !isPlaceholderUser(conversation.user);
      return conversationClient.create({
        id: conversation.id,
        title,
        agent_id: conversation.agent_id,
        access_control: conversation.access_control,
        origin: conversation.origin,
        state: roundCompletedEvent.data.conversation_state,
        status: roundCompletedEvent.data.round.status,
        read: false,
        rounds: [roundCompletedEvent.data.round],
        ...(isPersistentSubagentCreate && hasResolvedParentUser ? { user: conversation.user } : {}),
        ...(isPersistentSubagentCreate
          ? {
              parent_conversation_id: conversation.parent_conversation_id,
              parent_conversation_relation: ConversationParentRelation.subagent,
            }
          : {}),
        ...(roundCompletedEvent.data.attachments
          ? { attachments: roundCompletedEvent.data.attachments }
          : {}),
        ...(roundCompletedEvent.data.workspace_id
          ? { workspace_id: roundCompletedEvent.data.workspace_id }
          : {}),
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
  roundCompletedEvents$,
  action,
}: {
  conversation: Conversation;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
  conversationClient: ConversationClient;
  action?: ConversationAction;
}) => {
  return roundCompletedEvents$.pipe(
    switchMap((roundCompletedEvent) => {
      const { round, resumed = false, conversation_state } = roundCompletedEvent.data;

      // A resumed round keeps the pending round's id, so it is matched by id.
      // Regenerate mints a new id, so it has to name the round it supersedes —
      // an identity rather than stale data, so the snapshot is safe to read here.
      const replacesRoundId =
        action === 'regenerate' && !resumed
          ? conversation.rounds[conversation.rounds.length - 1]?.id
          : undefined;

      return conversationClient.upsertRound(
        {
          id: conversation.id,
          round,
          replacesRoundId,
          state: conversation_state,
          ...(roundCompletedEvent.data.attachments
            ? {
                attachments: {
                  snapshot: conversation.attachments ?? [],
                  produced: roundCompletedEvent.data.attachments,
                },
              }
            : {}),
          workspaceId: roundCompletedEvent.data.workspace_id,
        },
        { access: 'converse' }
      );
    }),
    switchMap((updatedConversation) => {
      return of(createConversationUpdatedEvent(updatedConversation));
    })
  );
};

export type ConversationOperation = 'CREATE' | 'UPDATE';

export type ConversationWithOperation = Conversation & { operation: ConversationOperation };

/**
 * Resolves the conversation to update, or returns a placeholder for one to create.
 * conversationId takes precedence over origin. When no conversationId is provided,
 * origin is used to find an existing conversation before creating a new placeholder.
 * autoCreateConversationWithId only applies when conversationId is provided: missing
 * conversations are created with that ID when enabled, and rejected by get() otherwise.
 * Note: Validation and manipulation for regenerate is handled in runDefaultAgentMode.
 */
export const getConversation = async ({
  agentId,
  conversationId,
  autoCreateConversationWithId = false,
  conversationClient,
  accessControl,
  origin,
  subagentCreation,
}: {
  agentId: string;
  conversationId: string | undefined;
  autoCreateConversationWithId?: boolean;
  conversationClient: ConversationClient;
  accessControl?: Pick<ConversationAccessControl, 'access_mode'>;
  origin?: ConversationOrigin;
  /**
   * When creating a fresh conversation for a persistent sub-agent, carries the
   * parent's linkage + a pre-selected title. The parent's user + access_control
   * are looked up here and snapshotted onto the new placeholder.
   */
  subagentCreation?: {
    parentConversationId: string;
    subagentName: string;
  };
}): Promise<ConversationWithOperation> => {
  // Case 1: No conversation ID - create new with placeholder
  if (!conversationId) {
    const conversation = origin ? await conversationClient.getByOrigin(origin) : undefined;

    if (conversation) {
      return {
        ...conversation,
        operation: 'UPDATE',
      };
    }

    return {
      ...placeholderConversation({ agentId, accessControl, origin }),
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
  const exists = await conversationClient.exists(conversationId);

  if (exists) {
    return {
      ...(await conversationClient.get(conversationId)),
      operation: 'UPDATE',
    };
  }

  // Case 3a: Creating a child conversation for a persistent sub-agent.
  //
  // Ownership: for a SHARED parent (owner A, driver B), the child must be
  // owned by A — not by B (the current driver). Snapshot the parent's `user`
  // + `access_control` when the parent already exists in ES.
  //
  // First-round nuance: when a user starts a fresh chat AND spawns a
  // persistent sub-agent in the same round, the parent conversation is still
  // an in-memory placeholder and isn't in ES yet — `get()` would throw. In
  // that case we fall through to `currentUser` via `createRequestToEs`, which
  // IS the about-to-be owner (they're creating the conversation), so
  // ownership matches by construction.
  if (subagentCreation) {
    const parentExists = await conversationClient.exists(subagentCreation.parentConversationId);
    if (parentExists) {
      const parent = await conversationClient.get(subagentCreation.parentConversationId);
      return {
        ...placeholderConversation({
          conversationId,
          agentId,
          accessControl: parent.access_control,
          origin,
        }),
        title: subagentCreation.subagentName,
        user: parent.user,
        parent_conversation_id: subagentCreation.parentConversationId,
        parent_conversation_relation: ConversationParentRelation.subagent,
        operation: 'CREATE',
      };
    }
    return {
      ...placeholderConversation({
        conversationId,
        agentId,
        accessControl,
        origin,
      }),
      title: subagentCreation.subagentName,
      parent_conversation_id: subagentCreation.parentConversationId,
      parent_conversation_relation: ConversationParentRelation.subagent,
      operation: 'CREATE',
    };
  }

  return {
    ...placeholderConversation({ conversationId, agentId, accessControl, origin }),
    operation: 'CREATE',
  };
};

/**
 * Sentinel user attached to a placeholder conversation. Callers that persist
 * the placeholder are expected to replace this with the current request user
 * (see `createRequestToEs`). Persistent sub-agent creations that want to keep
 * the placeholder's user (e.g. because they couldn't resolve a real owner from
 * the parent) MUST NOT forward this sentinel as an explicit user override —
 * `createConversation$` guards against that.
 */
export const PLACEHOLDER_USER: Conversation['user'] = {
  id: 'unknown',
  username: 'unknown',
};

export const isPlaceholderUser = (user: Conversation['user'] | undefined): boolean => {
  return user?.id === PLACEHOLDER_USER.id && user?.username === PLACEHOLDER_USER.username;
};

export const placeholderConversation = ({
  agentId,
  conversationId,
  accessControl,
  origin,
}: {
  agentId: string;
  conversationId?: string;
  accessControl?: Pick<ConversationAccessControl, 'access_mode'>;
  origin?: ConversationOrigin;
}): Conversation => {
  return {
    id: conversationId ?? uuidv4(),
    title: 'New conversation',
    agent_id: agentId,
    access_control: normalizeConversationAccessControl(accessControl),
    rounds: [],
    ...(origin ? { origin } : {}),
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    user: PLACEHOLDER_USER,
  };
};
