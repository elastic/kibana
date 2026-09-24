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
  ExecutionAbortedEvent,
  ExecutionFailedEvent,
  ExecutionInterruption,
  ExecutionStepEvent,
  ExecutionTerminalEvent,
  TimelineEvent,
  UserMessageEvent,
  ConversationEvent,
} from '@kbn/agent-builder-common';
import {
  TimelineEventType,
  interruptionOfTerminal,
  isEventsNativeVersion,
  isExecutionTerminalEvent,
  isTimelineEvent,
  lastExecutionTerminal,
  parseExecutionId,
  pendingPromptRequest,
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
  /** The execution's terminal: an outcome, a failure or an abort. */
  terminal: E & ExecutionTerminalEvent;
  /** Every event of the round, in timeline order. */
  events: E[];
}

/** A user message that triggered no execution, as it appears on the context timeline. */
export interface TimelineStandaloneUserMessage<E extends AnyTimelineEvent = TimelineEvent> {
  userMessage: UserMessageOf<E>;
}

export type TimelineEntry<E extends AnyTimelineEvent = TimelineEvent> =
  | TimelineRound<E>
  | TimelineStandaloneUserMessage<E>;

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
  // and a round sent in the same second apart. Interrupted executions fold into rounds like any
  // other, so nothing else is re-added.
  return [...folded, ...standaloneUserMessages(timelineEvents)].sort(
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
 * Groups a normalized timeline (see `eventsForContext`) into rounds. Ownership is resolved through
 * `execution_id` and `trigger_event_id`, never by parsing ids. An execution without a triggering
 * `user_message` or without a terminal event forms no round; interrupted executions do.
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
    const terminal = execution.events.find((event): event is E & ExecutionTerminalEvent =>
      isExecutionTerminalEvent(event)
    );
    if (!userMessage || !terminal) {
      continue;
    }
    const stepEvents = sortedSteps(execution.events);
    // Only an `execution_terminated` may carry a steps snapshot; interrupted terminals never do.
    const snapshotSteps =
      terminal.type === TimelineEventType.executionTerminated ? terminal.data.steps ?? [] : [];
    rounds.push({
      id: parseExecutionId(executionId)?.roundId ?? executionId,
      userMessage,
      steps: stepEvents.length > 0 ? stepEvents : snapshotSteps,
      terminal,
      // A trigger precedes its execution on a normalized timeline, so this keeps timeline order.
      events: [...triggers, ...execution.events],
    });
  }
  return rounds;
};

/** True when the round is paused on a prompt (on the folded timeline: its terminal is a pause). */
export const isAwaitingPrompt = (round: TimelineRound<AnyTimelineEvent>): boolean =>
  pendingPromptRequest(round.events as ConversationEvent[]) !== undefined;

/** True when the round's execution ended without an outcome. */
export const isInterruptedRound = (round: TimelineRound<AnyTimelineEvent>): boolean =>
  round.terminal.type !== TimelineEventType.executionTerminated;

/** How the round was interrupted, or undefined for a round that ended with an outcome. */
export const roundInterruption = (
  round: TimelineRound<AnyTimelineEvent>
): ExecutionInterruption | undefined =>
  isInterruptedRound(round)
    ? interruptionOfTerminal(round.terminal as ExecutionFailedEvent | ExecutionAbortedEvent)
    : undefined;

/** The round's assistant response; a paused or interrupted round has none. */
export const roundResponse = (round: TimelineRound<AnyTimelineEvent>): AssistantResponse => {
  if (round.terminal.type !== TimelineEventType.executionTerminated) {
    return { message: '' };
  }
  const { outcome } = round.terminal.data;
  return outcome.type === 'responded' ? outcome.response : { message: '' };
};

export { lastExecutionTerminal };

/** Narrows an entry to a round; a standalone user message has no execution to terminate. */
export const isTimelineRound = <E extends AnyTimelineEvent>(
  entry: TimelineEntry<E>
): entry is TimelineRound<E> => 'terminal' in entry;

export const isTimelineStandaloneUserMessage = <E extends AnyTimelineEvent>(
  entry: TimelineEntry<E>
): entry is TimelineStandaloneUserMessage<E> => !isTimelineRound(entry);

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
