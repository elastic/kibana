/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDeliveredMessageStep } from './conversation';
import type { DeliveredMessageStep } from './conversation';
import {
  TimelineEventType,
  isExecutionTerminalEvent,
  isSteerMessageEvent,
} from './timeline_events';
import type { ConversationEvent, ExecutionStepEvent, UserMessageEvent } from './timeline_events';

/**
 * The single implementation of "settled" and "pending" for steers, shared by the loop's drain, the
 * server's history partition and the client's timeline fold.
 *
 * A steer is *picked up* when an execution writes a `delivered_message` step naming it. It is
 * *settled* only when that execution's terminal is `execution_terminated`: an execution that
 * failed or was aborted settles nothing, so the next execution reads the steer again.
 */

interface DeliveredStepRecord {
  step: DeliveredMessageStep;
  executionId: string;
}

const deliveredSteps = (events: ReadonlyArray<ConversationEvent>): DeliveredStepRecord[] => {
  const records: DeliveredStepRecord[] = [];
  for (const event of events) {
    if (event.type !== TimelineEventType.executionStep || !event.execution_id) {
      continue;
    }
    const { step } = (event as ExecutionStepEvent).data;
    if (isDeliveredMessageStep(step)) {
      records.push({ step, executionId: event.execution_id });
    }
  }
  return records;
};

const terminalTypeByExecution = (
  events: ReadonlyArray<ConversationEvent>
): Map<string, TimelineEventType> => {
  const terminals = new Map<string, TimelineEventType>();
  for (const event of events) {
    if (event.execution_id && isExecutionTerminalEvent(event)) {
      terminals.set(event.execution_id, event.type);
    }
  }
  return terminals;
};

/** Ids of the steers named by a `delivered_message` step of an execution that finished. */
export const settledMessageIds = (events: ReadonlyArray<ConversationEvent>): Set<string> => {
  const terminals = terminalTypeByExecution(events);
  const settled = new Set<string>();
  for (const { step, executionId } of deliveredSteps(events)) {
    if (terminals.get(executionId) === TimelineEventType.executionTerminated) {
      settled.add(step.event_id);
    }
  }
  return settled;
};

/** Stamped messages no finished execution has read, oldest first. */
export const pendingSteers = (events: ReadonlyArray<ConversationEvent>): UserMessageEvent[] => {
  const settled = settledMessageIds(events);
  return events
    .filter(
      (event): event is UserMessageEvent => isSteerMessageEvent(event) && !settled.has(event.id)
    )
    .sort((left, right) => left.created_at.localeCompare(right.created_at));
};

/** How many executions read the steer and then failed or were aborted. */
export const unfinishedReadCount = (
  events: ReadonlyArray<ConversationEvent>,
  eventId: string
): number => {
  const terminals = terminalTypeByExecution(events);
  let count = 0;
  for (const { step, executionId } of deliveredSteps(events)) {
    if (step.event_id !== eventId) {
      continue;
    }
    const terminal = terminals.get(executionId);
    if (
      terminal === TimelineEventType.executionFailed ||
      terminal === TimelineEventType.executionAborted
    ) {
      count++;
    }
  }
  return count;
};

/** Pending steers stamped with this execution's id, for the per-run cap. */
export const pendingSteersFor = (
  events: ReadonlyArray<ConversationEvent>,
  executionId: string
): UserMessageEvent[] =>
  pendingSteers(events).filter((event) => event.data.steer?.execution_id === executionId);
