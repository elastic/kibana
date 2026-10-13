/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  AssistantResponse,
  AttachmentTimelineEvent,
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
  ROUND_DERIVED_EVENT_ID_SUFFIXES,
  TimelineEventType,
  interruptionOfTerminal,
  isAttachmentEvent,
  isCurrentFormatAttachmentEvent,
  isEventsNativeVersion,
  isExecutionTerminalEvent,
  isTimelineEvent,
  lastExecutionTerminal,
  parseExecutionId,
  pendingPromptRequest,
} from '@kbn/agent-builder-common';
import type {
  ConversationEventRepresentation,
  ProcessedRoundInput,
} from '@kbn/agent-builder-server';
import { eventsToRounds } from '../../../conversation/client/events_to_rounds';
import {
  isRoundDerivedEventId,
  roundsToEvents,
} from '../../../conversation/client/rounds_to_events';

/** A `user_message` whose payload has been processed for the agent (attachments migrated to refs, context rendered). */
export type ProcessedUserMessageEvent = Omit<UserMessageEvent, 'data'> & {
  data: ProcessedRoundInput;
};

/**
 * The context timeline as `eventsForContext` returns it: the built-in timeline events plus the
 * custom (registered) events stored on the conversation.
 */
export type ContextTimelineEvent = TimelineEvent | ConversationEvent;

/** A standalone (custom or attachment) event with its LLM representation resolved. */
export type ProcessedStandaloneEvent = ConversationEvent & {
  representation: ConversationEventRepresentation;
};

/**
 * The agent-context timeline: normalized events, with `user_message` payloads processed and
 * standalone events carrying their LLM representation.
 */
export type ProcessedTimelineEvent =
  | Exclude<TimelineEvent, UserMessageEvent>
  | ProcessedUserMessageEvent
  | ProcessedStandaloneEvent;

export type AnyTimelineEvent = TimelineEvent | ProcessedTimelineEvent | ConversationEvent;
/**
 * The `user_message` member of a timeline element type. Selected by discriminant rather than
 * intersected, so a custom event (whose `type` is any string) never masquerades as one.
 */
type UserMessageOf<E extends AnyTimelineEvent> = Extract<
  E,
  { type: TimelineEventType.userMessage }
>;
/**
 * The standalone events of a timeline element type: `ProcessedStandaloneEvent` for the processed
 * timeline, `ConversationEvent` otherwise (attachment events are built-in events).
 */
export type StandaloneEventOf<E extends AnyTimelineEvent> = [E] extends [ProcessedTimelineEvent]
  ? ProcessedStandaloneEvent
  : ConversationEvent;

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
  /** The attachment events sent with the message, in timeline order. */
  events: AttachmentTimelineEvent[];
}

/** An event owned by no execution, as it appears on the context timeline. */
export interface TimelineStandaloneEvent<E extends AnyTimelineEvent = TimelineEvent> {
  event: StandaloneEventOf<E>;
}

export type TimelineEntry<E extends AnyTimelineEvent = TimelineEvent> =
  | TimelineRound<E>
  | TimelineStandaloneUserMessage<E>
  | TimelineStandaloneEvent<E>;

/** Folding gives a round one execution id; a resume's attachment events keep theirs unless re-stamped. */
const foldedExecution = (event: AttachmentTimelineEvent): AttachmentTimelineEvent => {
  const parsed = event.execution_id ? parseExecutionId(event.execution_id) : undefined;
  return parsed
    ? { ...event, execution_id: `${parsed.roundId}${ROUND_DERIVED_EVENT_ID_SUFFIXES.execution}` }
    : event;
};

/**
 * The normalized timeline the agent context is built from: one execution per round, with HITL
 * resume executions folded into their round. Legacy (rounds-only) conversations serialize their
 * stored rounds; events-native conversations are folded and re-serialized. Context only, never
 * persisted, so downstream consumers can read events without reconstructing rounds.
 *
 * Custom (registered) events are carried through untouched: they belong to no execution, so
 * they are ordered by timestamp and stored position like the other non-round events. Attachment
 * events are carried through too, those of a resume re-stamped with their folded round's execution.
 */
export const eventsForContext = (conversation: Conversation): ContextTimelineEvent[] => {
  if (!isEventsNativeVersion(conversation.schema_version) || !conversation.events?.length) {
    return roundsToEvents(conversation);
  }
  const timelineEvents = conversation.events.filter(isTimelineEvent);
  const custom = conversation.events.filter((event) => !isTimelineEvent(event));
  const attachmentEvents = timelineEvents.filter(isAttachmentEvent).map(foldedExecution);
  const folded = roundsToEvents({ ...conversation, rounds: eventsToRounds(timelineEvents) });
  const positions = new Map(conversation.events.map((event, index) => [event.id, index]));
  const position = (id: string) => positions.get(id) ?? Number.MAX_SAFE_INTEGER;
  // Folding drops the standalone messages, the attachment events and the executions that never
  // terminated, so re-add the first two and restore the order they were stored in. Timestamps
  // come first because folding also synthesizes events that were never stored; stored position
  // then breaks ties, keeping a message and a round sent in the same second apart. Interrupted
  // executions fold into rounds like any other, so nothing else is re-added.
  return [
    ...folded,
    ...standaloneUserMessages(timelineEvents),
    ...attachmentEvents,
    ...custom,
  ].sort(
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

/** Narrows an entry to a standalone event. */
export const isTimelineStandaloneEvent = <E extends AnyTimelineEvent>(
  entry: TimelineEntry<E>
): entry is TimelineStandaloneEvent<E> => 'event' in entry;

export const isTimelineStandaloneUserMessage = <E extends AnyTimelineEvent>(
  entry: TimelineEntry<E>
): entry is TimelineStandaloneUserMessage<E> =>
  !isTimelineRound(entry) && !isTimelineStandaloneEvent(entry);

/** Selects user messages, excluding execution triggers and receipt-time round inputs. */
export const standaloneUserMessages = <E extends AnyTimelineEvent>(
  timeline: E[]
): Array<UserMessageOf<E>> => {
  // Input attachments of a message appended without execution point at it too; they trigger nothing.
  const triggerIds = new Set(
    timeline.filter((event) => event.execution_id).map((event) => event.trigger_event_id)
  );
  return timeline.filter(
    (event): event is E & UserMessageOf<E> =>
      event.type === TimelineEventType.userMessage &&
      !event.execution_id &&
      !triggerIds.has(event.id) &&
      !isRoundDerivedEventId(event.id)
  );
};

const userMessageIds = (timeline: ReadonlyArray<AnyTimelineEvent>): Set<string> =>
  new Set(
    timeline
      .filter((event) => event.type === TimelineEventType.userMessage)
      .map((event) => event.id)
  );

/** True when `event` is a `chat_input` attachment event linked to a message present in `messageIds`. */
const isLinkedInput = (event: AttachmentTimelineEvent, messageIds: ReadonlySet<string>): boolean =>
  event.data.source === 'chat_input' &&
  event.trigger_event_id !== undefined &&
  messageIds.has(event.trigger_event_id);

/**
 * The events owned by no execution: custom events, and attachment events with no execution that
 * no present message owns. Legacy `chat_input` events are left out: legacy refs render them.
 */
export const standaloneEvents = <E extends AnyTimelineEvent>(
  timeline: E[]
): Array<StandaloneEventOf<E>> => {
  const messageIds = userMessageIds(timeline);
  return timeline.filter((event) => {
    if (!isTimelineEvent(event)) {
      return true;
    }
    if (!isAttachmentEvent(event) || event.execution_id) {
      return false;
    }
    if (!isCurrentFormatAttachmentEvent(event) && event.data.source === 'chat_input') {
      return false;
    }
    return !isLinkedInput(event, messageIds);
  }) as Array<StandaloneEventOf<E>>;
};

const attachmentEventsOf = (timeline: ReadonlyArray<AnyTimelineEvent>): AttachmentTimelineEvent[] =>
  timeline.filter(isAttachmentEvent);

/** The current-format `chat_input` events sent with message `messageId`, in order. */
export const linkedInputEvents = (
  events: ReadonlyArray<AnyTimelineEvent>,
  messageId: string
): AttachmentTimelineEvent[] =>
  attachmentEventsOf(events).filter(
    (event) =>
      isCurrentFormatAttachmentEvent(event) &&
      event.data.source === 'chat_input' &&
      event.trigger_event_id === messageId
  );

/** The event an entry is ordered by: its triggering message, or the standalone event itself. */
const entryAnchor = <E extends AnyTimelineEvent>(
  entry: TimelineEntry<E>
): { id: string; created_at: string } =>
  isTimelineStandaloneEvent(entry) ? entry.event : entry.userMessage;

/** Groups execution history, user messages and standalone events without fabricating rounds. */
export const groupTimelineEntries = <E extends AnyTimelineEvent>(
  timeline: E[]
): Array<TimelineEntry<E>> => {
  const messageIds = userMessageIds(timeline);
  const messageInputs = attachmentEventsOf(timeline).filter(
    (event) => !event.execution_id && isLinkedInput(event, messageIds)
  );
  const entries: Array<TimelineEntry<E>> = [
    ...groupTimelineRounds(timeline),
    ...standaloneUserMessages(timeline).map((userMessage) => ({
      userMessage,
      events: messageInputs.filter((event) => event.trigger_event_id === userMessage.id),
    })),
    ...standaloneEvents(timeline).map((event) => ({ event })),
  ];
  const positions = new Map(timeline.map((event, index) => [event.id, index]));
  // Entries are concatenated by kind, so restore timeline order: by the entry's anchor event,
  // falling back to its position in `timeline` when two share a timestamp.
  return entries.sort((left, right) => {
    const leftAnchor = entryAnchor(left);
    const rightAnchor = entryAnchor(right);
    return (
      leftAnchor.created_at.localeCompare(rightAnchor.created_at) ||
      (positions.get(leftAnchor.id) ?? Number.MAX_SAFE_INTEGER) -
        (positions.get(rightAnchor.id) ?? Number.MAX_SAFE_INTEGER)
    );
  });
};
