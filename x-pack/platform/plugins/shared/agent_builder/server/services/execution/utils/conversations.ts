/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Observable } from 'rxjs';
import { switchMap, from, firstValueFrom } from 'rxjs';
import type {
  Conversation,
  ConversationAccessControl,
  ConversationOrigin,
  ConversationRoundAuthor,
  ConversationRoundOrigin,
  ConverseInput,
  RoundCompleteEvent,
  ExecutionTerminatedEvent,
  TimelineEvent,
  UserIdAndName,
  ChatEvent,
} from '@kbn/agent-builder-common';
import type { VersionedAttachment } from '@kbn/agent-builder-common/attachments';
import {
  ConversationParentRelation,
  isConversationAlreadyExistsError,
  isEventsNativeVersion,
  normalizeConversationAccessControl,
  DEFAULT_CONVERSATION_TITLE,
  TimelineEventType,
  ConversationRoundStatus,
} from '@kbn/agent-builder-common';
import type { ConversationClient } from '../../conversation';
import {
  roundToEvents,
  userMessageEvent,
  promptResponseEvent,
  resumeExecutionToEvents,
  executionTerminatedEventId,
  nextResumeIndex,
  resumeExecutionId,
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

/**
 * Writes a `user_message` event onto a conversation, creating the conversation first when the
 * resolution said so. The single place user messages are persisted: the executing path passes a
 * round-derived event id, a message appended on its own passes a uuid. Returns the written id so
 * a later execution can name it as its `trigger_event_id`.
 */
export const persistUserMessage = async ({
  conversation,
  conversationClient,
  eventId,
  receivedAt,
  input,
  author,
  origin,
  user,
  additionalEvents = [],
  attachments,
}: {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  eventId: string;
  receivedAt: Date;
  input: ConverseInput;
  author?: ConversationRoundAuthor;
  origin?: ConversationRoundOrigin;
  /** Actor fallback when the poster has no author, for a conversation they do not own. */
  user?: UserIdAndName;
  /** Attachment change events to store in the same write, after the message. */
  additionalEvents?: TimelineEvent[];
  attachments?: { snapshot: VersionedAttachment[]; produced: VersionedAttachment[] };
}): Promise<string> => {
  const event = userMessageEvent(
    {
      id: eventId,
      createdAt: receivedAt.toISOString(),
      input: {
        message: input.message?.trim() ?? '',
        ...(input.attachment_refs ? { attachment_refs: input.attachment_refs } : {}),
      },
      ...(author ? { author } : {}),
      ...(origin ? { origin } : {}),
    },
    { ...conversation, ...(user ? { user } : {}) }
  );

  const events = [event, ...additionalEvents];

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
        events,
        // Nothing is stored yet, so the produced list needs no reconciliation.
        ...(attachments ? { attachments: attachments.produced } : {}),
        ...(isPersistentSubagentCreate && hasResolvedParentUser ? { user: conversation.user } : {}),
        ...(conversation.parent_conversation
          ? { parent_conversation: conversation.parent_conversation }
          : {}),
      });
      return event.id;
    } catch (error) {
      if (!isConversationAlreadyExistsError(error)) {
        throw error;
      }
    }
  }

  await conversationClient.appendEvents(
    { id: conversation.id, events, ...(attachments ? { attachments } : {}) },
    { access: 'converse' }
  );

  return event.id;
};

/** True when the conversation's last round is paused on a prompt, so a run would resume it. */
export const isPendingResumeConversation = (conversation: ConversationWithOperation): boolean => {
  const lastRound = conversation.rounds[conversation.rounds.length - 1];
  return lastRound?.status === ConversationRoundStatus.awaitingPrompt;
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

          const events: TimelineEvent[] = [
            ...roundToEvents(round, conversation),
            ...(roundCompletedEvent.data.attachment_events ?? []),
          ];

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

          // Attachment events were stamped with the initial execution id at round-complete time;
          // for a resume they belong to exec_k.
          const attachmentEvents = (roundCompletedEvent.data.attachment_events ?? []).map(
            (event) => ({ ...event, execution_id: resumeExecutionId(round.id, resumeIndex) })
          );

          const resolvedTitle = title$ ? await firstValueFrom(title$) : undefined;

          const persisted = await conversationClient.appendEvents(
            {
              id: conversation.id,
              events: [promptResponse, ...executionEvents, ...attachmentEvents],
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
