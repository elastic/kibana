/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isDeliveredMessageStep } from './conversation';
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

/**
 * Messages sent to a running agent are re-sent to the model every remaining cycle, so this cap
 * times `STEER_MESSAGE_MAX_LENGTH` bounds the extra context a run carries. Per run; the loop caps
 * a single check separately.
 */
export const STEERS_PER_RUN_MAX = 5;

/** What the `delivered_message` steps of a timeline say about each steer. */
export interface SteerDeliveries {
  /** Steers a finished execution read: never delivered again. */
  settled: Set<string>;
  /** Steers an execution with no terminal yet has read. */
  readByLive: Set<string>;
  /** How many executions read each steer and then failed or were aborted. */
  unfinishedReads: Map<string, number>;
}

/** One pass over the timeline for everything the drain, the history partition and the UI ask. */
export const analyzeDeliveries = (events: ReadonlyArray<ConversationEvent>): SteerDeliveries => {
  const terminals = new Map<string, TimelineEventType>();
  for (const event of events) {
    if (event.execution_id && isExecutionTerminalEvent(event)) {
      terminals.set(event.execution_id, event.type);
    }
  }
  const deliveries: SteerDeliveries = {
    settled: new Set(),
    readByLive: new Set(),
    unfinishedReads: new Map(),
  };
  for (const event of events) {
    if (event.type !== TimelineEventType.executionStep || !event.execution_id) {
      continue;
    }
    const { step } = (event as ExecutionStepEvent).data;
    if (!isDeliveredMessageStep(step)) {
      continue;
    }
    const terminal = terminals.get(event.execution_id);
    if (terminal === undefined) {
      deliveries.readByLive.add(step.event_id);
    } else if (terminal === TimelineEventType.executionTerminated) {
      deliveries.settled.add(step.event_id);
    } else {
      deliveries.unfinishedReads.set(
        step.event_id,
        (deliveries.unfinishedReads.get(step.event_id) ?? 0) + 1
      );
    }
  }
  return deliveries;
};

/** Stamped messages no finished execution has read, oldest first. */
export const pendingSteers = (
  events: ReadonlyArray<ConversationEvent>,
  { settled }: SteerDeliveries = analyzeDeliveries(events)
): UserMessageEvent[] =>
  events
    .filter(
      (event): event is UserMessageEvent => isSteerMessageEvent(event) && !settled.has(event.id)
    )
    .sort((left, right) => left.created_at.localeCompare(right.created_at));

/** Pending steers stamped with this execution's id, for the per-run cap. */
export const pendingSteersFor = (
  events: ReadonlyArray<ConversationEvent>,
  executionId: string
): UserMessageEvent[] =>
  pendingSteers(events).filter((event) => event.data.steer?.execution_id === executionId);
