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
import type {
  ConversationEvent,
  ExecutionStepEvent,
  PromptResponseEvent,
  UserMessageEvent,
  UserMessageEventData,
} from './timeline_events';

/** A user message stamped with the execution it was sent to. */
export type SteerMessageEvent = UserMessageEvent & {
  data: UserMessageEventData & { steer: { execution_id: string } };
};

const isStamped = (event: ConversationEvent): event is SteerMessageEvent =>
  isSteerMessageEvent(event);

/**
 * A steer belongs to the execution it was stamped for. It is *read* when that execution writes a
 * `delivered_message` step naming it, and *settled* when that execution is over, however it ended:
 * a run that responded, failed or was stopped leaves nothing for the next run to read, so a steer
 * it never read stays unread and the user sends it again. A pause on a prompt is not an end: the
 * resume reads the paused run's steers, and the chain is over when its last resume is.
 */

/**
 * Maximum steers admitted per execution. Each stays in the prompt for the rest of the run, so with
 * `STEER_MESSAGE_MAX_LENGTH` this bounds the extra context.
 */
export const STEERS_PER_RUN_MAX = 5;

export interface SteerStatus {
  /** Steers some execution read, whatever became of it: rendered inside that turn. */
  read: Set<string>;
  /** Executions that are over, directly or through the resumes of their pause. */
  over: Set<string>;
  /** Executions paused on a prompt whose resumes are not over: the next resume reads their steers. */
  paused: Set<string>;
}

export const analyzeSteers = (events: ReadonlyArray<ConversationEvent>): SteerStatus => {
  const status: SteerStatus = { read: new Set(), over: new Set(), paused: new Set() };
  const pausedBy = new Map<string, string>();
  const resumedBy = new Map<string, string>();
  for (const event of events) {
    if (!event.execution_id) {
      continue;
    }
    if (event.type === TimelineEventType.executionStep) {
      const { step } = (event as ExecutionStepEvent).data;
      if (isDeliveredMessageStep(step)) {
        status.read.add(step.event_id);
      }
    } else if (event.type === TimelineEventType.promptResponse) {
      const paused = pausedBy.get((event as PromptResponseEvent).data.prompt_requested_event_id);
      if (paused) {
        resumedBy.set(paused, event.execution_id);
      }
    } else if (isExecutionTerminalEvent(event)) {
      if (
        event.type === TimelineEventType.executionTerminated &&
        event.data.outcome.type === 'prompt_requested'
      ) {
        pausedBy.set(event.id, event.execution_id);
        status.paused.add(event.execution_id);
      } else {
        status.over.add(event.execution_id);
      }
    }
  }
  // A paused execution is over once the chain of its resumes reaches an execution that is over.
  for (const executionId of status.paused) {
    let resume = resumedBy.get(executionId);
    while (resume && !status.over.has(resume)) {
      resume = resumedBy.get(resume);
    }
    if (resume) {
      status.over.add(executionId);
      status.paused.delete(executionId);
    }
  }
  return status;
};

/** Stamped messages whose execution is not over, oldest first. */
export const pendingSteers = (
  events: ReadonlyArray<ConversationEvent>,
  { over }: SteerStatus = analyzeSteers(events)
): SteerMessageEvent[] =>
  events
    .filter(
      (event): event is SteerMessageEvent =>
        isStamped(event) && !over.has(event.data.steer.execution_id)
    )
    .sort((left, right) => left.created_at.localeCompare(right.created_at));

/** Steers whose execution is over without having read them: history for later runs, never delivered. */
export const unreadSettledSteerIds = (
  events: ReadonlyArray<ConversationEvent>,
  { over, read }: SteerStatus = analyzeSteers(events)
): Set<string> =>
  new Set(
    events
      .filter(
        (event): event is SteerMessageEvent =>
          isStamped(event) && over.has(event.data.steer.execution_id) && !read.has(event.id)
      )
      .map((event) => event.id)
  );

/** Pending steers stamped with this execution's id, for the per-run cap. */
export const pendingSteersFor = (
  events: ReadonlyArray<ConversationEvent>,
  executionId: string
): SteerMessageEvent[] =>
  pendingSteers(events).filter((event) => event.data.steer.execution_id === executionId);

/**
 * Pending steers this execution reads: its own, and those of the paused executions it resumes. A
 * paused chain is the only one a conversation can hold while a run is live, so every paused
 * execution is in it.
 */
export const steersToDeliver = (
  events: ReadonlyArray<ConversationEvent>,
  executionId: string,
  status: SteerStatus = analyzeSteers(events)
): SteerMessageEvent[] =>
  pendingSteers(events, status).filter(
    ({ data: { steer } }) =>
      steer.execution_id === executionId || status.paused.has(steer.execution_id)
  );
