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
  ExecutionStepEvent,
  ExecutionTerminatedEvent,
  TimelineEvent,
  UserMessageEvent,
} from '@kbn/agent-builder-common';
import {
  TimelineEventType,
  isEventsNativeVersion,
  isToolCallStep,
} from '@kbn/agent-builder-common';
import type { ProcessedRoundInput } from '@kbn/agent-builder-server';
import { eventsToRounds } from '../../../conversation/client/events_to_rounds';
import { parseExecutionId, roundsToEvents } from '../../../conversation/client/rounds_to_events';

/**
 * The normalized timeline the agent context is built from: one execution per round, with HITL
 * resume executions folded into their round. Legacy (rounds-only) conversations serialize their
 * stored rounds; events-native conversations are folded and re-serialized. Context only, never
 * persisted, so downstream consumers can read events without reconstructing rounds.
 */
export const eventsForContext = (conversation: Conversation): TimelineEvent[] =>
  isEventsNativeVersion(conversation.schema_version) &&
  conversation.events &&
  conversation.events.length > 0
    ? roundsToEvents({ ...conversation, rounds: eventsToRounds(conversation.events) })
    : roundsToEvents(conversation);

/** A `user_message` whose payload has been processed for the agent (attachments migrated to refs, context rendered). */
export type ProcessedUserMessageEvent = Omit<UserMessageEvent, 'data'> & {
  data: ProcessedRoundInput;
};

/** The agent-context timeline: normalized events, with `user_message` payloads processed. */
export type ProcessedTimelineEvent =
  | Exclude<TimelineEvent, UserMessageEvent>
  | ProcessedUserMessageEvent;

type AnyTimelineEvent = TimelineEvent | ProcessedTimelineEvent;
type UserMessageOf<E extends AnyTimelineEvent> = Extract<
  E,
  { type: TimelineEventType.userMessage }
>;

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
 * Groups a normalized timeline (see `eventsForContext`) into rounds. Ownership is resolved through
 * `execution_id` and `trigger_event_id`, never by parsing ids. An execution without a triggering
 * `user_message` or without a terminal event forms no round.
 */
export const groupTimelineRounds = <E extends AnyTimelineEvent>(
  timeline: E[]
): Array<TimelineRound<E>> => {
  // One pass: lifecycle events bucketed by execution (first-seen order), content events by id.
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

  const rounds: Array<TimelineRound<E>> = [];
  for (const [executionId, execution] of executions) {
    const triggers = Array.from(execution.triggerIds, (id) => contentEvents.get(id)).filter(
      (event): event is E => event !== undefined
    );
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
    const stepEvents = execution.events
      .filter(
        (event): event is E & ExecutionStepEvent => event.type === TimelineEventType.executionStep
      )
      .sort((a, b) => a.data.sequence - b.data.sequence);
    const steps =
      stepEvents.length > 0
        ? stepEvents.map((event) => event.data.step)
        : terminated.data.steps ?? [];
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

/** The events of the rounds at positions `[start, end)` of the round order. */
export const sliceTimelineRounds = <E extends AnyTimelineEvent>(
  timeline: E[],
  start: number,
  end?: number
): E[] =>
  groupTimelineRounds(timeline)
    .slice(start, end)
    .flatMap((round) => round.events);

/** Events strictly after `eventId`; the full timeline when the cursor is unknown (safe direction). */
export const sliceTimelineAfterEvent = <E extends AnyTimelineEvent>(
  timeline: E[],
  eventId: string
): E[] => {
  const index = timeline.findIndex((event) => event.id === eventId);
  return index === -1 ? timeline : timeline.slice(index + 1);
};

/** One LLM turn's worth of timeline: a tool-call group plus the events leading up to it. */
export interface TimelineCycle<E extends AnyTimelineEvent = TimelineEvent> {
  events: E[];
  steps: ConversationRoundStep[];
  toolCallGroupId?: string;
  lastEventId: string;
}

const stepOf = (event: AnyTimelineEvent): ConversationRoundStep | undefined =>
  event.type === TimelineEventType.executionStep ? event.data.step : undefined;

/**
 * Cycle boundary = change of `tool_call_group_id` on tool-call steps. Events preceding a group
 * attach to it; events following a group stay with it until the next group or the next
 * `user_message`, which always starts a new unit so a cursor never hides a round's trigger.
 */
export const groupTimelineCycles = <E extends AnyTimelineEvent>(
  timeline: E[]
): Array<TimelineCycle<E>> => {
  const cycles: Array<TimelineCycle<E>> = [];
  let pending: E[] = [];
  let current: TimelineCycle<E> | undefined;

  const cycleFrom = (events: E[], toolCallGroupId?: string): TimelineCycle<E> => ({
    events: [...events],
    steps: events.map(stepOf).filter((s): s is ConversationRoundStep => s !== undefined),
    toolCallGroupId,
    lastEventId: events[events.length - 1].id,
  });

  for (const event of timeline) {
    const step = stepOf(event);
    const groupId =
      step && isToolCallStep(step) ? step.tool_call_group_id ?? step.tool_call_id : undefined;

    if (groupId !== undefined) {
      if (!current || current.toolCallGroupId !== groupId) {
        current = cycleFrom([...pending, event], groupId);
        pending = [];
        cycles.push(current);
        continue;
      }
      current.events.push(event);
      current.steps.push(step!);
      current.lastEventId = event.id;
      continue;
    }

    if (event.type === TimelineEventType.userMessage) {
      if (!current && pending.length > 0) {
        cycles.push(cycleFrom(pending));
      }
      current = undefined;
      pending = [event];
      continue;
    }

    if (current) {
      current.events.push(event);
      if (step) current.steps.push(step);
      current.lastEventId = event.id;
    } else {
      pending.push(event);
    }
  }

  if (pending.length > 0) {
    cycles.push(cycleFrom(pending));
  }
  return cycles;
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
