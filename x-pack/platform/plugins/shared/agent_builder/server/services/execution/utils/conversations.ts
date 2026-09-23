/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Observable } from 'rxjs';
import { switchMap, from, firstValueFrom } from 'rxjs';
import type { Logger } from '@kbn/logging';
import type {
  Conversation,
  ConversationAccessControl,
  ConversationOrigin,
  ConversationRoundAuthor,
  ConversationRoundOrigin,
  ConverseInput,
  ExecutionInterruption,
  ExecutionPartialRunSummary,
  RoundCompleteEvent,
  RoundCompleteEventData,
  RoundInput,
  RoundInterruptedEventData,
  ExecutionTerminatedEvent,
  TimelineEvent,
  UserIdAndName,
  ChatEvent,
} from '@kbn/agent-builder-common';
import {
  ConversationParentRelation,
  isConversationAlreadyExistsError,
  isEventsNativeVersion,
  isExecutionAbortReason,
  isExecutionTerminalEvent,
  isRequestAbortedError,
  normalizeConversationAccessControl,
  DEFAULT_CONVERSATION_TITLE,
  TimelineEventType,
  ROUND_DERIVED_EVENT_ID_SUFFIXES,
  executionTerminatedEventId,
  resumeExecutionId,
} from '@kbn/agent-builder-common';
import type { ConversationClient } from '../../conversation';
import {
  roundToEvents,
  userMessageEvent,
  promptResponseEvent,
  resumeExecutionToEvents,
  interruptedExecutionToEvents,
  lastTerminatedExecutionIndex,
  nextResumeIndex,
} from '../../conversation/client/rounds_to_events';
import { createConversationUpdatedEvent, createConversationCreatedEvent } from './events';
import { getPendingResumeRound } from './pending_round';
import { toClientError } from './convert_errors';
import { serializeExecutionError } from './serialize_execution_error';

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
          // The prompt being answered belongs to the last execution that *terminated* (paused);
          // an interrupted resume in between counts for the index but never owns the pause.
          const terminatedIndex = lastTerminatedExecutionIndex(conversation, round.id);
          if (terminatedIndex < 0) {
            throw new Error(
              `appendResumeExecution$: round ${round.id} has no terminated execution to resume`
            );
          }
          const promptRequestedEventId = executionTerminatedEventId(round.id, terminatedIndex);

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

/** True when the conversation's last round is paused on a prompt: the next input resumes it. */
export const isPendingResumeConversation = (conversation: Conversation): boolean =>
  getPendingResumeRound(conversation) !== undefined;

export interface PersistExecutionInterruptionParams {
  conversation: ConversationWithOperation;
  conversationClient: ConversationClient;
  /** The runner's round id (fresh rounds); a resume uses the pending round's id instead. */
  roundId: string;
  receivedAt: Date;
  /** The converse input as received; the fallback when no processed input is available. */
  input: ConverseInput;
  author?: ConversationRoundAuthor;
  origin?: ConversationRoundOrigin;
  /**
   * The raw stream error. `RequestAbortedError` ⇒ `execution_aborted`; anything else ⇒
   * `execution_failed` carrying the client-normalised error.
   */
  error: unknown;
  /** The handler's partial run summary, when `round_interrupted` was emitted. */
  interrupted?: RoundInterruptedEventData;
  /** The `round_complete` payload, when the run completed but the success write failed. */
  completed?: RoundCompleteEventData;
  logger: Logger;
}

/**
 * Persists a failed or aborted execution as a full projection with exactly one terminal event.
 *
 * - Fresh round: `replaceRoundEvents` with `user_message` (rebuilt with the inputs of the receipt
 *   write, its `data` upgraded to the processed input when known) + `execution_started` + steps +
 *   terminal + attachment events. No `status`, no `state`.
 * - HITL resume: `appendEvents` with `prompt_response(k)` + the `exec_k` projection + attachment
 *   events re-stamped with `exec_k`; the round stays `awaiting_prompt`.
 *
 * Both writes carry the client's atomic terminal guard (`skipIfTerminalExistsFor`), so a landed
 * success write is never overwritten. Returns the written terminal event(s): `[]` when the write
 * was skipped or failed. Never throws — a write failure is logged; the original error is what the
 * caller surfaces.
 */
export const persistExecutionInterruption = async (
  params: PersistExecutionInterruptionParams
): Promise<TimelineEvent[]> => {
  const {
    conversation,
    conversationClient,
    receivedAt,
    input,
    author,
    origin,
    error,
    interrupted,
    completed,
    logger,
  } = params;

  try {
    const interruption: ExecutionInterruption = isRequestAbortedError(error)
      ? {
          type: 'aborted',
          ...(isExecutionAbortReason(error.meta?.abort_reason)
            ? { aborted_by: error.meta.abort_reason }
            : {}),
        }
      : { type: 'failed', error: serializeExecutionError(toClientError(error)) };

    const isResume = isPendingResumeConversation(conversation);
    const roundId = isResume
      ? conversation.rounds[conversation.rounds.length - 1].id
      : params.roundId;
    const executionIndex = isResume ? nextResumeIndex(conversation, roundId) : 0;
    const executionId =
      executionIndex === 0
        ? `${roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.execution}`
        : resumeExecutionId(roundId, executionIndex);

    const startedAt =
      interrupted?.started_at ?? completed?.round.started_at ?? receivedAt.toISOString();
    const steps = interrupted?.steps ?? completed?.round.steps ?? [];
    const summary: ExecutionPartialRunSummary =
      interrupted?.summary ??
      (completed
        ? {
            model_usage: completed.round.model_usage,
            time_to_last_token: completed.round.time_to_last_token,
            ...(completed.round.trace_id ? { trace_id: completed.round.trace_id } : {}),
            ...(completed.round.configuration_overrides
              ? { configuration_overrides: completed.round.configuration_overrides }
              : {}),
          }
        : { time_to_last_token: Math.max(0, Date.now() - new Date(startedAt).getTime()) });
    const processedInput = interrupted?.input ?? completed?.round.input;
    const attachments = interrupted?.attachments ?? completed?.attachments;
    const attachmentEvents = interrupted?.attachment_events ?? completed?.attachment_events ?? [];
    const workspaceId = interrupted?.workspace_id ?? completed?.workspace_id;

    const attachmentsUpdate = attachments
      ? { attachments: { snapshot: conversation.attachments ?? [], produced: attachments } }
      : {};
    const workspaceUpdate = workspaceId ? { workspaceId } : {};

    /** `[]` when the client skipped the write because a terminal already existed. */
    const writtenTerminals = (
      persisted: Conversation,
      executionEvents: TimelineEvent[]
    ): TimelineEvent[] => {
      const terminals = executionEvents.filter(isExecutionTerminalEvent);
      const landed = terminals.every((terminal) =>
        persisted.events?.some((event) => event.id === terminal.id)
      );
      if (!landed) {
        // The stored winner is another terminal (typically a success write whose response was
        // lost). The stream still surfaces the original error, so the live client and the stored
        // record disagree for this execution — see the follow-ups in the design doc.
        logger.warn(
          `Execution ${executionId} already had a terminal event; interruption write skipped and the stream error may disagree with the stored record`
        );
        return [];
      }
      return terminals;
    };

    if (!isResume) {
      // Rebuilt with the exact inputs `persistRoundInput` used, so id, actor and created_at match
      // the receipt-time event; only `data` is upgraded to the processed input when known.
      const receiptInput: RoundInput = {
        message: input.message ?? '',
        ...(input.attachment_refs ? { attachment_refs: input.attachment_refs } : {}),
      };
      const userMessage = userMessageEvent(
        {
          id: roundId,
          input: processedInput ?? receiptInput,
          started_at: receivedAt.toISOString(),
          ...(author ? { author } : {}),
          ...(origin ? { origin } : {}),
        },
        conversation
      );
      const executionEvents = interruptedExecutionToEvents({
        roundId,
        executionIndex: 0,
        startedAt,
        triggerEventId: userMessage.id,
        steps,
        summary,
        interruption,
        conversation,
      });
      const persisted = await conversationClient.replaceRoundEvents(
        {
          id: conversation.id,
          roundId,
          events: [userMessage, ...executionEvents, ...attachmentEvents],
          skipIfTerminalExistsFor: executionId,
          ...attachmentsUpdate,
          ...workspaceUpdate,
        },
        { access: 'converse' }
      );
      return writtenTerminals(persisted, executionEvents);
    }

    const terminatedIndex = lastTerminatedExecutionIndex(conversation, roundId);
    if (terminatedIndex < 0) {
      throw new Error(`round ${roundId} is awaiting a prompt but has no terminated execution`);
    }
    const promptResponse = promptResponseEvent({
      roundId,
      executionIndex,
      promptRequestedEventId: executionTerminatedEventId(roundId, terminatedIndex),
      responses: input.prompts ?? {},
      input: processedInput ?? { message: input.message ?? '' },
      conversation,
      author,
      createdAt: startedAt,
    });
    const executionEvents = interruptedExecutionToEvents({
      roundId,
      executionIndex,
      startedAt,
      triggerEventId: promptResponse.id,
      steps,
      summary,
      interruption,
      conversation,
    });
    // Attachment events were stamped with the initial execution id by the handler; they belong
    // to exec_k on a resume, exactly as in `appendResumeExecution$`.
    const resumeAttachmentEvents = attachmentEvents.map((event) => ({
      ...event,
      execution_id: executionId,
    }));
    const persisted = await conversationClient.appendEvents(
      {
        id: conversation.id,
        events: [promptResponse, ...executionEvents, ...resumeAttachmentEvents],
        skipIfTerminalExistsFor: executionId,
        ...attachmentsUpdate,
        ...workspaceUpdate,
      },
      { access: 'converse' }
    );
    return writtenTerminals(persisted, executionEvents);
  } catch (writeError) {
    logger.error(
      `Failed to persist interrupted execution for conversation ${conversation.id}: ${
        writeError instanceof Error ? writeError.message : String(writeError)
      }`
    );
    return [];
  }
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
