/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Observable } from 'rxjs';
import { forkJoin, switchMap, from, firstValueFrom, map } from 'rxjs';
import type {
  Conversation,
  ConversationAccessControl,
  ConversationOrigin,
  ConversationRoundAuthor,
  ConversationRoundOrigin,
  ConverseInput,
  RoundCompleteEvent,
  ConversationAction,
  ConversationRound,
  ExecutionTerminatedEvent,
  TimelineEvent,
  UserIdAndName,
  ChatEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationParentRelation,
  isConversationAlreadyExistsError,
  isEventsNativeVersion,
  normalizeConversationAccessControl,
  DEFAULT_CONVERSATION_TITLE,
  TimelineEventType,
} from '@kbn/agent-builder-common';
import type { ConversationClient } from '../../conversation';
import {
  roundToEvents,
  roundTerminatedEvent,
  userMessageEvent,
  promptResponseEvent,
  resumeExecutionToEvents,
  executionTerminatedEventId,
  nextResumeIndex,
} from '../../conversation/client/rounds_to_events';
import { createConversationUpdatedEvent, createConversationCreatedEvent } from './events';

/**
 * Resolves a persisted timeline event by id from the write result we just committed.
 * For events-native docs the write response carries the freshly written timeline, so we forward
 * that exact event (its ids match what a subsequent GET returns). For legacy (non events-native)
 * docs the response's `events` are derived from rounds at read time and are stale relative to
 * the write, so we fall back to the projection we just built — it is what GET would derive too.
 *
 * `expectedType` narrows the lookup and the return type; `fallback` is used only for legacy docs
 * (or when the persisted timeline is missing the entry for the current round, which happens when
 * the round has no terminal outcome yet).
 */
const persistedTimelineEvent = <T extends TimelineEvent>({
  persistedConversation,
  eventId,
  expectedType,
  fallback,
}: {
  persistedConversation: Conversation;
  eventId: string;
  expectedType: TimelineEventType;
  fallback: T | undefined;
}): T | undefined => {
  if (isEventsNativeVersion(persistedConversation.schema_version)) {
    const persisted = persistedConversation.events?.find(
      (event) => event.id === eventId && event.type === expectedType
    );
    if (persisted) {
      return persisted as T;
    }
  }
  return fallback;
};

const findEventByType = <T extends TimelineEvent>(
  events: TimelineEvent[],
  expectedType: TimelineEventType
): T | undefined => events.find((event) => event.type === expectedType) as T | undefined;

/**
 * Post-write emission: the persisted `execution_terminated` event (when present) followed by the
 * conversation lifecycle event. Ordering keeps the lifecycle event last so downstream consumers
 * still terminate on it. `execution_started` is projected earlier from `round_started` (see
 * {@link ./execution_started.ts}), not from the post-write phase.
 */
const emitPersistedTimelineThenLifecycle = ({
  terminated,
  lifecycle,
}: {
  terminated: ExecutionTerminatedEvent | undefined;
  lifecycle: ChatEvent;
}): Observable<ChatEvent> => {
  const events: ChatEvent[] = [];
  if (terminated) events.push(terminated);
  events.push(lifecycle);
  return from<ChatEvent[]>(events);
};

const buildRoundsPathTerminatedFallback = (
  round: ConversationRound,
  conversation: Conversation
): ExecutionTerminatedEvent | undefined => {
  const terminated = roundTerminatedEvent(round, conversation);
  return terminated && terminated.type === TimelineEventType.executionTerminated
    ? (terminated as ExecutionTerminatedEvent)
    : undefined;
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
}): Observable<ChatEvent> => {
  return forkJoin({
    title: title$,
    roundCompletedEvent: roundCompletedEvents$,
  }).pipe(
    switchMap(async ({ title, roundCompletedEvent }) => {
      // Persistent sub-agent creations: link to the parent and snapshot the parent's user
      const isPersistentSubagentCreate = Boolean(conversation.parent_conversation);
      const hasResolvedParentUser =
        Boolean(conversation.user) && !isPlaceholderUser(conversation.user);

      const round = roundCompletedEvent.data.round;
      const created = await conversationClient.create({
        id: conversation.id,
        title,
        agent_id: conversation.agent_id,
        access_control: conversation.access_control,
        origin: conversation.origin,
        read_only: conversation.read_only,
        state: roundCompletedEvent.data.conversation_state,
        status: round.status,
        rounds: [round],
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

      return { created, round };
    }),
    switchMap(({ created, round }) => {
      const terminated = persistedTimelineEvent<ExecutionTerminatedEvent>({
        persistedConversation: created,
        eventId: executionTerminatedEventId(round.id, 0),
        expectedType: TimelineEventType.executionTerminated,
        fallback: buildRoundsPathTerminatedFallback(round, created),
      });
      return emitPersistedTimelineThenLifecycle({
        terminated,
        lifecycle: createConversationCreatedEvent(created),
      });
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
}): Observable<ChatEvent> => {
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

      const persisted$: Observable<Conversation> = title$
        ? forkJoin({ updated: from(roundUpserted$), title: title$ }).pipe(
            switchMap(({ title }) =>
              // system-driven write of generated title, not a user-initiated rename,
              // so converse access is the right check.
              from(
                conversationClient.update({ id: conversation.id, title }, { access: 'converse' })
              )
            )
          )
        : from(roundUpserted$);

      return persisted$.pipe(map((persisted) => ({ persisted, round })));
    }),
    switchMap(({ persisted, round }) => {
      const terminated = persistedTimelineEvent<ExecutionTerminatedEvent>({
        persistedConversation: persisted,
        eventId: executionTerminatedEventId(round.id, 0),
        expectedType: TimelineEventType.executionTerminated,
        fallback: buildRoundsPathTerminatedFallback(round, persisted),
      });
      return emitPersistedTimelineThenLifecycle({
        terminated,
        lifecycle: createConversationUpdatedEvent(persisted),
      });
    })
  );
};

/**
 * Receipt-time input write.
 */
export const persistRoundInput = async ({
  conversation,
  conversationClient,
  roundId,
  receivedAt,
  input,
  author,
  origin,
}: {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  roundId: string;
  receivedAt: Date;
  input: ConverseInput;
  author?: ConversationRoundAuthor;
  origin?: ConversationRoundOrigin;
}): Promise<void> => {
  const event = userMessageEvent(
    {
      id: roundId,
      input: {
        message: input.message ?? '',
        ...(input.attachment_refs ? { attachment_refs: input.attachment_refs } : {}),
      },
      started_at: receivedAt.toISOString(),
      ...(author ? { author } : {}),
      ...(origin ? { origin } : {}),
    },
    conversation
  );

  if (conversation.operation === 'CREATE') {
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
        events: [event],
        ...(isPersistentSubagentCreate && hasResolvedParentUser ? { user: conversation.user } : {}),
        ...(conversation.parent_conversation
          ? { parent_conversation: conversation.parent_conversation }
          : {}),
      });
      return;
    } catch (error) {
      if (!isConversationAlreadyExistsError(error)) {
        throw error;
      }
    }
  }

  await conversationClient.appendEvents(
    { id: conversation.id, events: [event] },
    { access: 'converse' }
  );
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

          const events: TimelineEvent[] = roundToEvents(round, conversation);

          const resolvedTitle = title$ ? await firstValueFrom(title$) : undefined;

          const persisted = await conversationClient.replaceRoundEvents(
            {
              id: conversation.id,
              roundId: round.id,
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

          return { persisted, events, round };
        })()
      );
    }),
    switchMap(({ persisted, events, round }) => {
      const terminated = persistedTimelineEvent<ExecutionTerminatedEvent>({
        persistedConversation: persisted,
        eventId: executionTerminatedEventId(round.id, 0),
        expectedType: TimelineEventType.executionTerminated,
        fallback: findEventByType<ExecutionTerminatedEvent>(
          events,
          TimelineEventType.executionTerminated
        ),
      });
      const lifecycle =
        conversation.operation === 'CREATE'
          ? createConversationCreatedEvent(persisted)
          : createConversationUpdatedEvent(persisted);
      return emitPersistedTimelineThenLifecycle({ terminated, lifecycle });
    })
  );
};

/**
 * Append-only resume write. A resumed round is a new execution (`exec_k`) on the same round: this
 * appends a `prompt_response` event (the human's answer) plus the resume execution's events, and
 * never rewrites the pause (`exec_0`). `eventsToRounds` folds the executions back into one round on
 * read.
 */
export const appendResumeExecution$ = ({
  conversation,
  conversationClient,
  roundCompletedEvents$,
  input,
  author,
  title$,
}: {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  roundCompletedEvents$: Observable<RoundCompleteEvent>;
  /** The converse input for this resume; `input.prompts` carries the human's responses. */
  input: ConverseInput;
  author?: ConversationRoundAuthor;
  /** When provided, its resolved value is persisted as the title alongside the resume append. */
  title$?: Observable<string>;
}): Observable<ChatEvent> => {
  return roundCompletedEvents$.pipe(
    switchMap((roundCompletedEvent) =>
      from(
        (async () => {
          const {
            round,
            resume_execution: resumeExecution,
            conversation_state: conversationState,
            attachments,
            workspace_id: workspaceId,
          } = roundCompletedEvent.data;

          if (!resumeExecution) {
            throw new Error('appendResumeExecution$ requires a resume_execution payload');
          }
          const followUpRound = resumeExecution.follow_up_round;

          const resumeIndex = nextResumeIndex(conversation, round.id);
          if (resumeIndex < 1) {
            throw new Error(
              `appendResumeExecution$: no prior execution stored for round ${round.id}; cannot resume`
            );
          }
          const promptRequestedEventId = executionTerminatedEventId(round.id, resumeIndex - 1);

          const promptResponse = promptResponseEvent({
            roundId: round.id,
            executionIndex: resumeIndex,
            promptRequestedEventId,
            responses: input.prompts ?? {},
            input: followUpRound.input,
            conversation,
            author,
            createdAt: followUpRound.started_at,
          });

          const executionEvents = resumeExecutionToEvents({
            followUpRound,
            roundId: round.id,
            executionIndex: resumeIndex,
            triggerEventId: promptResponse.id,
            conversation,
          });

          const resolvedTitle = title$ ? await firstValueFrom(title$) : undefined;

          const persisted = await conversationClient.appendEvents(
            {
              id: conversation.id,
              events: [promptResponse, ...executionEvents],
              status: round.status,
              ...(resolvedTitle !== undefined ? { title: resolvedTitle } : {}),
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

          return { persisted, executionEvents, round, resumeIndex };
        })()
      )
    ),
    switchMap(({ persisted, executionEvents, round, resumeIndex }) => {
      const terminated = persistedTimelineEvent<ExecutionTerminatedEvent>({
        persistedConversation: persisted,
        eventId: executionTerminatedEventId(round.id, resumeIndex),
        expectedType: TimelineEventType.executionTerminated,
        fallback: findEventByType<ExecutionTerminatedEvent>(
          executionEvents,
          TimelineEventType.executionTerminated
        ),
      });
      return emitPersistedTimelineThenLifecycle({
        terminated,
        lifecycle: createConversationUpdatedEvent(persisted),
      });
    })
  );
};

export type ConversationOperation = 'CREATE' | 'UPDATE';

export type ConversationWithOperation = Conversation & { operation: ConversationOperation };

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
