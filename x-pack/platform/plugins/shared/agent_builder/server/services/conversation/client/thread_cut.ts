/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CompactionSummary,
  Conversation,
  ConversationEvent,
  ConversationRound,
  ExecutionTerminatedEvent,
} from '@kbn/agent-builder-common';
import {
  TimelineEventType,
  createBadRequestError,
  isExecutionTerminalEvent,
  isMessageEvent,
  isThreadStartedEvent,
  isTimelineEvent,
  parseExecutionId,
  pendingPromptRequest,
} from '@kbn/agent-builder-common';
import {
  coveredRoundIds,
  legacyEligibleRoundIds,
} from '../../execution/run_agent/utils/compaction_coverage';
import { eventsToRounds } from './events_to_rounds';

export interface ThreadCopy {
  events: ConversationEvent[];
  rounds: ConversationRound[];
  compactionSummary?: CompactionSummary;
  /** The last copied event, absent when nothing was copied. */
  cutEventId?: string;
}

const roundIdOf = (executionId: string): string =>
  parseExecutionId(executionId)?.roundId ?? executionId;

const isStandaloneMessage = (event: ConversationEvent, triggerIds: ReadonlySet<string>) =>
  !event.execution_id && !triggerIds.has(event.id) && isMessageEvent(event);

const defaultCutIndex = (events: ConversationEvent[]): number => {
  const triggerIds = new Set(
    events.flatMap((event) => (event.trigger_event_id ? [event.trigger_event_id] : []))
  );

  let cut = 0;
  for (let index = events.length - 1; index >= 0; index--) {
    const event = events[index];

    if (isExecutionTerminalEvent(event) || isStandaloneMessage(event, triggerIds)) {
      cut = index + 1;
      break;
    }
  }

  return cut;
};

const pausedRoundStart = (events: ConversationEvent[], pause: ExecutionTerminatedEvent): number => {
  const roundId = roundIdOf(pause.execution_id ?? pause.id);

  return events.findIndex(
    (event) =>
      event.id === pause.trigger_event_id ||
      (event.execution_id !== undefined && roundIdOf(event.execution_id) === roundId)
  );
};

/**
 * The number of parent events a thread copies. Without an id: everything up to the last terminal
 * event or trailing standalone message, minus a round paused on a prompt. A `user_message` id
 * cuts just before it, an `execution_terminated` id just after it.
 */
export const cutIndexForThread = (events: ConversationEvent[], cutEventId?: string): number => {
  if (cutEventId === undefined) {
    const cut = defaultCutIndex(events);
    const pause = pendingPromptRequest(events.slice(0, cut));

    return pause ? pausedRoundStart(events, pause) : cut;
  }

  const index = events.findIndex((event) => event.id === cutEventId);
  const event = events[index];

  if (event?.type === TimelineEventType.userMessage) {
    return index;
  }

  if (event?.type === TimelineEventType.executionTerminated) {
    if (pendingPromptRequest(events.slice(0, index + 1))) {
      throw createBadRequestError(`Cannot start a thread at a turn paused on a prompt`);
    }

    return index + 1;
  }

  throw createBadRequestError(
    `Event ${cutEventId} is not a user message or a terminated execution of this conversation`
  );
};

const summaryFitsCopy = ({
  summary,
  parent,
  copiedEventIds,
  copiedRoundIds,
}: {
  summary: CompactionSummary;
  parent: Conversation;
  copiedEventIds: ReadonlySet<string>;
  copiedRoundIds: ReadonlySet<string>;
}): boolean => {
  const covered = coveredRoundIds({
    summary,
    rounds: parent.rounds,
    legacyEligibleIds: legacyEligibleRoundIds((parent.events ?? []).filter(isTimelineEvent)),
  });

  if (![...covered].every((roundId) => copiedRoundIds.has(roundId))) {
    return false;
  }

  const cursor = summary.summarized_up_to;

  if (!cursor) {
    return true;
  }

  return 'event_id' in cursor
    ? copiedEventIds.has(cursor.event_id)
    : copiedRoundIds.has(cursor.round_id);
};

/** The part of the parent a thread starts with: its events up to the cut, their rounds and, when it fits, its compaction summary. */
export const copyForThread = (parent: Conversation, cutEventId?: string): ThreadCopy => {
  const parentEvents = parent.events ?? [];
  const events = parentEvents.slice(0, cutIndexForThread(parentEvents, cutEventId));

  const copiedRoundIds = new Set(eventsToRounds(events).map(({ id }) => id));
  const rounds = parent.rounds.filter(({ id }) => copiedRoundIds.has(id));

  const summary = parent.state?.compaction_summary;
  const keepSummary =
    summary !== undefined &&
    summaryFitsCopy({
      summary,
      parent,
      copiedEventIds: new Set(events.map(({ id }) => id)),
      copiedRoundIds,
    });

  return {
    events,
    rounds,
    ...(keepSummary ? { compactionSummary: summary } : {}),
    ...(events.length > 0 ? { cutEventId: events[events.length - 1].id } : {}),
  };
};

/** A thread as its readers see it: its own history from `thread_started` on, without the copied parent events. */
export const toThreadView = <T extends Pick<Conversation, 'events' | 'rounds'>>(thread: T): T => {
  const events = thread.events ?? [];
  const start = events.findIndex(isThreadStartedEvent);

  if (start <= 0) {
    return thread;
  }

  const ownEvents = events.slice(start);
  const ownRoundIds = new Set(eventsToRounds(ownEvents).map(({ id }) => id));

  return {
    ...thread,
    events: ownEvents,
    rounds: thread.rounds.filter(({ id }) => ownRoundIds.has(id)),
  };
};
