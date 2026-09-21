/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AssistantResponse,
  Conversation,
  ConversationRoundStep,
  ExecutionFailedEvent,
  ExecutionStepEvent,
  ExecutionTerminatedEvent,
  TimelineEvent,
  UserMessageEvent,
  ConversationEvent,
} from '@kbn/agent-builder-common';
import {
  TimelineEventType,
  isEventsNativeVersion,
  isTimelineEvent,
  parseExecutionId,
} from '@kbn/agent-builder-common';
import type { ProcessedRoundInput } from '@kbn/agent-builder-server';
import { eventsToRounds } from '../../../conversation/client/events_to_rounds';
import {
  isRoundDerivedEventId,
  roundsToEvents,
} from '../../../conversation/client/rounds_to_events';

/** A `user_message` whose payload has been processed for the agent (attachments migrated to refs, context rendered). */
export type ProcessedUserMessageEvent = Omit<UserMessageEvent, 'data'> & {
  data: ProcessedRoundInput;
};

/** The agent-context timeline: normalized events, with `user_message` payloads processed. */
export type ProcessedTimelineEvent =
  | Exclude<TimelineEvent, UserMessageEvent>
  | ProcessedUserMessageEvent;

type AnyTimelineEvent = TimelineEvent | ProcessedTimelineEvent | ConversationEvent;
type UserMessageOf<E extends AnyTimelineEvent> = E & UserMessageEvent;

/** A round as it appears on the normalized context timeline: one execution triggered by a user message. */
export interface TimelineRound<E extends AnyTimelineEvent = TimelineEvent> {
  id: string;
  userMessage: UserMessageOf<E>;
  /** The execution's steps, in sequence order. */
  steps: ConversationRoundStep[];
  terminated: ExecutionTerminatedEvent;
  /** Every event of the round, in timeline order. */
  events: E[];
}

/**
 * An initial execution (`exec_0`) that failed: its user message never got an answer. Surfaced to
 * the agent as the user message followed by a failure notice; its steps are not rendered.
 */
export interface TimelineFailedExecution<E extends AnyTimelineEvent = TimelineEvent> {
  /** The round id. */
  id: string;
  userMessage: UserMessageOf<E>;
  /** The steps completed before the failure, in sequence order. */
  steps: ConversationRoundStep[];
  failed: ExecutionFailedEvent;
  /** Every event of the failed execution, in timeline order: the user message then the run. */
  events: E[];
}

/** A user message that triggered no execution, as it appears on the context timeline. */
export interface TimelineStandaloneUserMessage<E extends AnyTimelineEvent = TimelineEvent> {
  userMessage: UserMessageOf<E>;
}

export type TimelineEntry<E extends AnyTimelineEvent = TimelineEvent> =
  | TimelineRound<E>
  | TimelineFailedExecution<E>
  | TimelineStandaloneUserMessage<E>;

/** How many of the most recent failed initial executions are surfaced to the agent. */
export const MAX_FAILED_EXECUTIONS_IN_CONTEXT = 3;

/**
 * The normalized timeline the agent context is built from: one execution per round, with HITL
 * resume executions folded into their round. Legacy (rounds-only) conversations serialize their
 * stored rounds; events-native conversations are folded and re-serialized. Context only, never
 * persisted, so downstream consumers can read events without reconstructing rounds.
 */
export const eventsForContext = (conversation: Conversation): TimelineEvent[] => {
  if (!isEventsNativeVersion(conversation.schema_version) || !conversation.events?.length) {
    return roundsToEvents(conversation);
  }
  const timelineEvents = conversation.events.filter(isTimelineEvent);
  const folded = roundsToEvents({ ...conversation, rounds: eventsToRounds(timelineEvents) });
  const positions = new Map(conversation.events.map((event, index) => [event.id, index]));
  const position = (id: string) => positions.get(id) ?? Number.MAX_SAFE_INTEGER;
  // Folding drops the standalone messages and the executions that never terminated, so re-add
  // them and restore the order they were stored in. Timestamps come first because folding also
  // synthesizes events that were never stored; stored position then breaks ties, keeping a message
  // and a round sent in the same second apart.
  //
  // Failed initial executions are surfaced (capped to the most recent ones, so repeated failures
  // cannot grow the context without bound); aborted executions and failed resumes never are.
  const failed = groupTimelineFailedExecutions(timelineEvents)
    .sort(
      (left, right) =>
        right.userMessage.created_at.localeCompare(left.userMessage.created_at) ||
        position(right.userMessage.id) - position(left.userMessage.id)
    )
    .slice(0, MAX_FAILED_EXECUTIONS_IN_CONTEXT)
    .flatMap((entry) => entry.events);
  return [...folded, ...standaloneUserMessages(timelineEvents), ...failed].sort(
    (left, right) =>
      left.created_at.localeCompare(right.created_at) || position(left.id) - position(right.id)
  );
};

/** Lifecycle events bucketed by execution (first-seen order) and content events by id. */
const bucketExecutions = <E extends AnyTimelineEvent>(timeline: E[]) => {
  const executions = new Map<string, { events: E[]; triggerIds: Set<string> }>();
  const contentEvents = new Map<string, E>();
  for (const event of timeline) {
    if (!event.execution_id) {
      contentEvents.set(event.id, event);
      continue;
    }
    let execution = executions.get(event.execution_id);
    if (!execution) {
      execution = { events: [], triggerIds: new Set() };
      executions.set(event.execution_id, execution);
    }
    execution.events.push(event);
    if (event.trigger_event_id) {
      execution.triggerIds.add(event.trigger_event_id);
    }
  }
  const triggersOf = (execution: { triggerIds: Set<string> }): E[] =>
    Array.from(execution.triggerIds, (id) => contentEvents.get(id)).filter(
      (event): event is E => event !== undefined
    );
  return { executions, triggersOf };
};

const sortedSteps = <E extends AnyTimelineEvent>(events: E[]): ConversationRoundStep[] =>
  events
    .filter(
      (event): event is E & ExecutionStepEvent => event.type === TimelineEventType.executionStep
    )
    .sort((a, b) => a.data.sequence - b.data.sequence)
    .map((event) => event.data.step);

/**
 * Groups the failed initial executions of a timeline: executions triggered by a `user_message`
 * whose events contain an `execution_failed` and no `execution_terminated`. Failed resumes (a
 * `prompt_response` trigger) and aborted executions form no entry.
 */
export const groupTimelineFailedExecutions = <E extends AnyTimelineEvent>(
  timeline: E[]
): Array<TimelineFailedExecution<E>> => {
  const { executions, triggersOf } = bucketExecutions(timeline);
  const entries: Array<TimelineFailedExecution<E>> = [];
  for (const [executionId, execution] of executions) {
    const triggers = triggersOf(execution);
    const userMessage = triggers.find((event) => event.type === TimelineEventType.userMessage) as
      | UserMessageOf<E>
      | undefined;
    const failed = execution.events.find(
      (event): event is E & ExecutionFailedEvent => event.type === TimelineEventType.executionFailed
    );
    const terminated = execution.events.some(
      (event) => event.type === TimelineEventType.executionTerminated
    );
    if (!userMessage || !failed || terminated) {
      continue;
    }
    entries.push({
      id: parseExecutionId(executionId)?.roundId ?? executionId,
      userMessage,
      steps: sortedSteps(execution.events),
      failed,
      events: [...triggers, ...execution.events],
    });
  }
  return entries;
};

/**
 * Groups a normalized timeline (see `eventsForContext`) into rounds. Ownership is resolved through
 * `execution_id` and `trigger_event_id`, never by parsing ids. An execution without a triggering
 * `user_message` or without a terminal event forms no round.
 */
export const groupTimelineRounds = <E extends AnyTimelineEvent>(
  timeline: E[]
): Array<TimelineRound<E>> => {
  const { executions, triggersOf } = bucketExecutions(timeline);

  const rounds: Array<TimelineRound<E>> = [];
  for (const [executionId, execution] of executions) {
    const triggers = triggersOf(execution);
    const userMessage = triggers.find((event) => event.type === TimelineEventType.userMessage) as
      | UserMessageOf<E>
      | undefined;
    const terminated = execution.events.find(
      (event): event is E & ExecutionTerminatedEvent =>
        event.type === TimelineEventType.executionTerminated
    );
    if (!userMessage || !terminated) {
      continue;
    }
    const stepEvents = sortedSteps(execution.events);
    const steps = stepEvents.length > 0 ? stepEvents : (terminated.data.steps ?? []);
    rounds.push({
      id: parseExecutionId(executionId)?.roundId ?? executionId,
      userMessage,
      steps,
      terminated,
      // A trigger precedes its execution on a normalized timeline, so this keeps timeline order.
      events: [...triggers, ...execution.events],
    });
  }
  return rounds;
};

/**
 * The events of the rounds at positions `[start, end)` of the round order, plus the failed
 * executions that fall inside that range (by their user message's timestamp: not older than the
 * first kept round's, older than the first excluded round's). Failed executions older than the cut
 * are dropped, never summarised. Implemented as a filter over the timeline so stored order — which
 * grouping and compaction rely on — is preserved.
 */
export const sliceTimelineRounds = <E extends AnyTimelineEvent>(
  timeline: E[],
  start: number,
  end?: number
): E[] => {
  const rounds = groupTimelineRounds(timeline);
  const kept = rounds.slice(start, end);
  const upperBound = end !== undefined ? rounds[end]?.userMessage.created_at : undefined;
  // Failed entries survive when they are not older than the cut. The cut is the first kept
  // round's user message; when the cut removes every round (a summary covering them all), it is
  // the end of the last removed round, so nothing interleaved with removed rounds is resurrected.
  const afterLower = (at: string): boolean => {
    if (start <= 0) {
      return true;
    }
    const firstKept = rounds[start];
    if (firstKept) {
      return at >= firstKept.userMessage.created_at;
    }
    const lastCut = rounds[Math.min(start, rounds.length) - 1];
    return lastCut ? at > lastCut.terminated.created_at : true;
  };
  const keptIds = new Set<string>(kept.flatMap((round) => round.events.map((event) => event.id)));
  for (const failed of groupTimelineFailedExecutions(timeline)) {
    const at = failed.userMessage.created_at;
    const beforeUpper = upperBound === undefined || at < upperBound;
    if (afterLower(at) && beforeUpper) {
      failed.events.forEach((event) => keptIds.add(event.id));
    }
  }
  return timeline.filter((event) => keptIds.has(event.id));
};

export const isAwaitingPrompt = (round: TimelineRound<AnyTimelineEvent>): boolean =>
  round.terminated.data.outcome.type === 'prompt_requested';

/** The round's assistant response; a paused round has none yet. */
export const roundResponse = (round: TimelineRound<AnyTimelineEvent>): AssistantResponse => {
  const { outcome } = round.terminated.data;
  return outcome.type === 'responded' ? outcome.response : { message: '' };
};

/** The terminal event of the timeline's last execution, if any. */
export const lastExecutionTerminated = (
  timeline: AnyTimelineEvent[]
): ExecutionTerminatedEvent | undefined =>
  timeline.findLast(
    (event): event is ExecutionTerminatedEvent =>
      event.type === TimelineEventType.executionTerminated
  );

/** Narrows an entry to a round; a standalone user message has no execution to terminate. */
export const isTimelineRound = <E extends AnyTimelineEvent>(
  entry: TimelineEntry<E>
): entry is TimelineRound<E> => 'terminated' in entry;

/** Narrows an entry to a failed initial execution. */
export const isTimelineFailedExecution = <E extends AnyTimelineEvent>(
  entry: TimelineEntry<E>
): entry is TimelineFailedExecution<E> => 'failed' in entry;

export const isTimelineStandaloneUserMessage = <E extends AnyTimelineEvent>(
  entry: TimelineEntry<E>
): entry is TimelineStandaloneUserMessage<E> =>
  !isTimelineRound(entry) && !isTimelineFailedExecution(entry);

/** Selects user messages, excluding execution triggers and receipt-time round inputs. */
export const standaloneUserMessages = <E extends AnyTimelineEvent>(
  timeline: E[]
): Array<UserMessageOf<E>> => {
  const triggerIds = new Set(timeline.map((event) => event.trigger_event_id));
  return timeline.filter(
    (event): event is E & UserMessageOf<E> =>
      event.type === TimelineEventType.userMessage &&
      !event.execution_id &&
      !triggerIds.has(event.id) &&
      !isRoundDerivedEventId(event.id)
  );
};

/** Groups execution history and user messages without fabricating rounds. */
export const groupTimelineEntries = <E extends AnyTimelineEvent>(
  timeline: E[]
): Array<TimelineEntry<E>> => {
  const entries: Array<TimelineEntry<E>> = [
    ...groupTimelineRounds(timeline),
    ...groupTimelineFailedExecutions(timeline),
    ...standaloneUserMessages(timeline).map((userMessage) => ({ userMessage })),
  ];
  const positions = new Map(timeline.map((event, index) => [event.id, index]));
  // Entries are concatenated by kind, so restore timeline order: by the entry's triggering
  // message, falling back to its position in `timeline` when two share a timestamp.
  return entries.sort(
    (left, right) =>
      left.userMessage.created_at.localeCompare(right.userMessage.created_at) ||
      (positions.get(left.userMessage.id) ?? Number.MAX_SAFE_INTEGER) -
        (positions.get(right.userMessage.id) ?? Number.MAX_SAFE_INTEGER)
  );
};
