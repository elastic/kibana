/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../../../services/events';

/** The prompts a paused execution is waiting on, or [] when the event is not a pause. */
const requestedPrompts = (event: TimelineDisplayEvent): PromptRequest[] => {
  if (event.type !== TimelineEventType.executionTerminated) {
    return [];
  }
  const { outcome } = event.data;
  return outcome.type === 'prompt_requested' ? outcome.prompts : [];
};

const RESUME_TERMINAL_TYPES: ReadonlySet<string> = new Set([
  TimelineEventType.executionTerminated,
  TimelineEventType.executionFailed,
  TimelineEventType.executionAborted,
]);

/**
 * True when this answer settles the pause: its resume has not started yet (optimistic answer),
 * is still running, or ended with `execution_terminated`. An answer whose resume ended in
 * `execution_failed`/`execution_aborted` leaves the pause open — the server keeps the round
 * `awaiting_prompt` and expects a new answer.
 */
const answerSettlesPrompt = (events: TimelineDisplayEvent[], answeringEventId: string): boolean => {
  const resumeExecution = events.find(
    (event) => event.trigger_event_id === answeringEventId && event.execution_id !== undefined
  );
  if (!resumeExecution) {
    return true;
  }
  let resumeTerminal: TimelineDisplayEvent | undefined;
  for (const event of events) {
    if (
      event.execution_id === resumeExecution.execution_id &&
      RESUME_TERMINAL_TYPES.has(event.type)
    ) {
      resumeTerminal = event;
    }
  }
  return !resumeTerminal || resumeTerminal.type === TimelineEventType.executionTerminated;
};

/**
 * The id of the `execution_terminated` event whose prompts the conversation is waiting on right
 * now, or undefined when nothing is pending.
 *
 * The pause is the last `execution_terminated` event (`execution_failed`/`execution_aborted`
 * are ignored — an interrupted resume never owns the pause, mirroring the server's
 * `lastTerminatedExecutionIndex`). It is closed when any of its answers settles it.
 */
export const findAwaitingPromptEventId = (events: TimelineDisplayEvent[]): string | undefined => {
  let pauseEvent: TimelineDisplayEvent | undefined;
  for (const event of events) {
    if (event.type === TimelineEventType.executionTerminated) {
      pauseEvent = event;
    }
  }
  if (!pauseEvent || requestedPrompts(pauseEvent).length === 0) {
    return undefined;
  }

  const promptRequestedEventId = pauseEvent.id;
  const isClosed = events.some(
    (event) =>
      event.type === TimelineEventType.promptResponse &&
      event.data.prompt_requested_event_id === promptRequestedEventId &&
      answerSettlesPrompt(events, event.id)
  );
  return isClosed ? undefined : promptRequestedEventId;
};
