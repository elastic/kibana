/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Observable } from 'rxjs';
import {
  of,
  forkJoin,
  switchMap,
  from,
  ignoreElements,
  firstValueFrom,
  bufferTime,
  catchError,
  concatMap,
  filter,
  EMPTY,
} from 'rxjs';
import type { Logger } from '@kbn/logging';
import type {
  Conversation,
  ConversationAccessControl,
  ConversationOrigin,
  RoundCompleteEvent,
  RoundStartedEvent,
  RoundStepEvent,
  ConversationAction,
  TimelineEvent,
  UserIdAndName,
  ChatEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationParentRelation,
  TimelineEventType,
  isConversationAlreadyExistsError,
  normalizeConversationAccessControl,
  DEFAULT_CONVERSATION_TITLE,
} from '@kbn/agent-builder-common';
import type { ConversationClient } from '../../conversation';
import {
  agentActor,
  roundStartEvents,
  roundStepEventId,
  roundStepEvents,
  roundTerminatedEvent,
} from '../../conversation/client/rounds_to_events';
import { createConversationUpdatedEvent, createConversationCreatedEvent } from './events';

export const STEP_FLUSH_MS = 500;
export const STEP_FLUSH_MAX = 10;

export interface InFlightWrites {
  /** Registers a write. Returns the original promise so call sites can keep chaining on it. */
  track: <T>(promise: Promise<T>) => Promise<T>;
  /** Resolves once every tracked write has settled (fulfilled or rejected). Never rejects. */
  settled: () => Promise<void>;
}

/** Creates an {@link InFlightWrites} tracker scoped to one persistence pipeline. */
export const createInFlightWrites = (): InFlightWrites => {
  const pending = new Set<Promise<void>>();

  const track = <T>(promise: Promise<T>): Promise<T> => {
    const entry: Promise<void> = promise.then(
      () => undefined,
      () => undefined
    );
    pending.add(entry);
    entry.then(() => pending.delete(entry));
    return promise;
  };

  const settled = async (): Promise<void> => {
    // Loop: writes dispatched while we were waiting must be drained too.
    while (pending.size > 0) {
      await Promise.all([...pending]);
    }
  };

  return { track, settled };
};

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
    'id' | 'agent_id' | 'access_control' | 'origin' | 'user' | 'parent_conversation' | 'read_only'
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
      // Persistent sub-agent creations: link to the parent and snapshot the parent's user
      const isPersistentSubagentCreate = Boolean(conversation.parent_conversation);
      const hasResolvedParentUser =
        Boolean(conversation.user) && !isPlaceholderUser(conversation.user);

      return conversationClient.create({
        id: conversation.id,
        title,
        agent_id: conversation.agent_id,
        access_control: conversation.access_control,
        origin: conversation.origin,
        read_only: conversation.read_only,
        state: roundCompletedEvent.data.conversation_state,
        status: roundCompletedEvent.data.round.status,
        rounds: [roundCompletedEvent.data.round],
        ...(isPersistentSubagentCreate && hasResolvedParentUser ? { user: conversation.user } : {}),
        ...(conversation.parent_conversation
          ? { parent_conversation: conversation.parent_conversation }
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
 * Update an existing conversation and emit the corresponding event.
 * When `title$` is provided, the generated title is persisted alongside the round upsert.
 */
export const updateConversation$ = ({
  conversationClient,
  conversation,
  roundCompletedEvents$,
  action,
  title$,
}: {
  conversation: Conversation;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
  conversationClient: ConversationClient;
  action?: ConversationAction;
  title$?: Observable<string>;
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

      const roundUpserted$ = conversationClient.upsertRound(
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

      if (!title$) {
        return roundUpserted$;
      }

      // Persist the generated title if provided
      return forkJoin({ updated: roundUpserted$, title: title$ }).pipe(
        switchMap(({ title }) => {
          // system-driven write of generated title, not a user-initiated rename, so converse access is the right check.
          return conversationClient.update({ id: conversation.id, title }, { access: 'converse' });
        })
      );
    }),
    switchMap((updatedConversation) => {
      return of(createConversationUpdatedEvent(updatedConversation));
    })
  );
};

export const startConversation$ = ({
  conversation,
  conversationClient,
  roundStartedEvents$,
  inFlightWrites,
}: {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  roundStartedEvents$: Observable<RoundStartedEvent>;
  inFlightWrites?: InFlightWrites;
}): Observable<ChatEvent> => {
  return roundStartedEvents$.pipe(
    switchMap((roundStartedEvent) => {
      const ensureCreated = async (): Promise<void> => {
        if (conversation.operation !== 'CREATE') {
          return;
        }
        const isPersistentSubagentCreate = Boolean(conversation.parent_conversation);
        const hasResolvedParentUser =
          Boolean(conversation.user) && !isPlaceholderUser(conversation.user);
        try {
          await conversationClient.create({
            id: conversation.id,
            title: DEFAULT_CONVERSATION_TITLE,
            agent_id: conversation.agent_id,
            access_control: conversation.access_control,
            origin: conversation.origin,
            read_only: conversation.read_only,
            rounds: [],
            ...(isPersistentSubagentCreate && hasResolvedParentUser
              ? { user: conversation.user }
              : {}),
            ...(conversation.parent_conversation
              ? { parent_conversation: conversation.parent_conversation }
              : {}),
          });
        } catch (error) {
          // Someone else won the eager-create race; the doc exists, keep going.
          if (!isConversationAlreadyExistsError(error)) {
            throw error;
          }
        }
      };

      const appendStart = async (): Promise<void> => {
        const {
          round_id: id,
          input,
          started_at: startedAt,
          author: eventAuthor,
          origin: eventOrigin,
        } = roundStartedEvent.data;
        const events = roundStartEvents(
          {
            id,
            input,
            started_at: startedAt,
            ...(eventAuthor ? { author: eventAuthor } : {}),
            ...(eventOrigin ? { origin: eventOrigin } : {}),
          },
          conversation
        );
        await conversationClient.appendEvents(
          { id: conversation.id, events },
          { access: 'converse' }
        );
      };

      const startWrite = (async () => {
        await ensureCreated();
        await appendStart();
      })();

      return from(inFlightWrites ? inFlightWrites.track(startWrite) : startWrite);
    }),
    // Side-effect only; the conversationCreated/Updated event fires at END.
    ignoreElements()
  );
};

export const streamRoundSteps$ = ({
  conversation,
  conversationClient,
  roundStepEvents$,
  inFlightWrites,
  logger,
}: {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  roundStepEvents$: Observable<RoundStepEvent>;
  /** Every flush is registered so teardown cleanup can wait for in-flight writes to settle. */
  inFlightWrites: InFlightWrites;
  logger: Logger;
}): Observable<ChatEvent> => {
  return roundStepEvents$.pipe(
    bufferTime(STEP_FLUSH_MS, null, STEP_FLUSH_MAX),
    filter((batch) => batch.length > 0),
    concatMap((batch) =>
      from(
        inFlightWrites.track(
          conversationClient.appendEvents(
            {
              id: conversation.id,
              events: batch.map((event) => stepChatEventToTimelineEvent(event, conversation)),
            },
            { access: 'converse' }
          )
        )
      ).pipe(
        catchError((error) => {
          logger.warn(
            `Failed to flush step events for conversation ${conversation.id}: ${error.message}`
          );
          return EMPTY;
        })
      )
    ),
    ignoreElements()
  );
};

const stepChatEventToTimelineEvent = (
  event: RoundStepEvent,
  conversation: Pick<Conversation, 'agent_id'>
): TimelineEvent => {
  const { round_id: roundId, execution_id: executionId, step, sequence } = event.data;
  return {
    id: roundStepEventId(roundId, sequence),
    type: TimelineEventType.executionStep,
    // Timestamped at emission time; `eventsToRounds` sorts by `sequence`, not by `created_at`,
    // so this is purely for observability/debug.
    created_at: new Date().toISOString(),
    actor: agentActor(conversation),
    execution_id: executionId,
    trigger_event_id: `${roundId}::user_message`,
    data: { step, sequence },
  };
};

export const appendRoundTerminated$ = ({
  conversation,
  conversationClient,
  roundCompletedEvents$,
  title$,
}: {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
  /** When provided, its resolved value is persisted as the title alongside the END append. */
  title$?: Observable<string>;
}): Observable<ChatEvent> => {
  return roundCompletedEvents$.pipe(
    switchMap((roundCompletedEvent) => {
      return from(
        (async () => {
          const {
            round,
            conversation_state: conversationState,
            attachments,
            workspace_id: workspaceId,
          } = roundCompletedEvent.data;

          const stepEvents = roundStepEvents(round, conversation);
          const terminated = roundTerminatedEvent(round, conversation);
          const events: TimelineEvent[] = [...stepEvents, ...(terminated ? [terminated] : [])];

          const resolvedTitle = title$ ? await firstValueFrom(title$) : undefined;

          return conversationClient.appendEvents(
            {
              id: conversation.id,
              events,
              ...(resolvedTitle !== undefined ? { title: resolvedTitle } : {}),
              status: round.status,
              ...(conversationState ? { state: conversationState } : {}),
              ...(attachments
                ? {
                    attachments: {
                      snapshot: conversation.attachments ?? [],
                      produced: attachments,
                    },
                  }
                : {}),
              ...(workspaceId ? { workspaceId } : {}),
            },
            { access: 'converse' }
          );
        })()
      );
    }),
    switchMap((persistedConversation) =>
      of(
        conversation.operation === 'CREATE'
          ? createConversationCreatedEvent(persistedConversation)
          : createConversationUpdatedEvent(persistedConversation)
      )
    )
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
  readOnly,
}: {
  agentId: string;
  conversationId: string | undefined;
  autoCreateConversationWithId?: boolean;
  conversationClient: ConversationClient;
  accessControl?: Pick<ConversationAccessControl, 'access_mode'>;
  origin?: ConversationOrigin;
  subagentCreation?: {
    parentConversationId: string;
    subagentName: string;
  };
  readOnly?: boolean;
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
      ...placeholderConversation({ agentId, accessControl, origin, readOnly }),
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
  if (subagentCreation) {
    const parentLink = {
      id: subagentCreation.parentConversationId,
      relation: ConversationParentRelation.subagent,
    };
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
        parent_conversation: parentLink,
        operation: 'CREATE',
      };
    }
    return {
      ...placeholderConversation({
        conversationId,
        agentId,
        accessControl,
        origin,
        readOnly,
      }),
      title: subagentCreation.subagentName,
      parent_conversation: parentLink,
      operation: 'CREATE',
    };
  }

  return {
    ...placeholderConversation({ conversationId, agentId, accessControl, origin }),
    operation: 'CREATE',
  };
};

/**
 * Sentinel user attached to a placeholder conversation.
 */
export const PLACEHOLDER_USER: UserIdAndName = {
  id: 'unknown',
  username: 'unknown',
};

export const isPlaceholderUser = (user: UserIdAndName | undefined): boolean => {
  return user?.id === PLACEHOLDER_USER.id && user?.username === PLACEHOLDER_USER.username;
};

export const placeholderConversation = ({
  agentId,
  conversationId,
  accessControl,
  origin,
  readOnly,
}: {
  agentId: string;
  conversationId?: string;
  accessControl?: Pick<ConversationAccessControl, 'access_mode'>;
  origin?: ConversationOrigin;
  readOnly?: boolean;
}): Conversation => {
  return {
    id: conversationId ?? uuidv4(),
    title: DEFAULT_CONVERSATION_TITLE,
    agent_id: agentId,
    access_control: normalizeConversationAccessControl(accessControl),
    read_only: readOnly ?? false,
    rounds: [],
    ...(origin ? { origin } : {}),
    updated_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    user: PLACEHOLDER_USER,
  };
};
