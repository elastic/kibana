/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PromptRequest } from '@kbn/agent-builder-common/agents';
import { TimelineEventType } from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../../../services/events';

export interface OutstandingPrompt {
  /** The event the answer joins back to. */
  pauseEventId: string;
  prompts: PromptRequest[];
}

const RUN_TERMINAL_TYPES: ReadonlySet<string> = new Set([
  TimelineEventType.executionTerminated,
  TimelineEventType.executionFailed,
  TimelineEventType.executionAborted,
]);

/** The prompts a run ended up waiting on, empty when it ended any other way. */
export const pausePrompts = (event: TimelineDisplayEvent): PromptRequest[] => {
  if (event.type !== TimelineEventType.executionTerminated) {
    return [];
  }
  const { outcome } = event.data;
  return outcome.type === 'prompt_requested' ? outcome.prompts : [];
};

/** Ids of the pauses a human has already answered. */
export const answeredPauseIds = (events: TimelineDisplayEvent[]): Set<string> => {
  const answered = new Set<string>();
  for (const event of events) {
    if (event.type === TimelineEventType.promptResponse) {
      answered.add(event.data.prompt_requested_event_id);
    }
  }
  return answered;
};

/**
 * The prompts the conversation is waiting on right now, or undefined when it waits on nothing.
 * Only the last run can be open, so a later run ending clears an earlier pause.
 */
export const findOutstandingPrompt = (
  events: TimelineDisplayEvent[]
): OutstandingPrompt | undefined => {
  const answered = answeredPauseIds(events);

  let lastRunEnd: TimelineDisplayEvent | undefined;
  for (const event of events) {
    if (RUN_TERMINAL_TYPES.has(event.type)) {
      lastRunEnd = event;
    }
  }
  if (!lastRunEnd) {
    return undefined;
  }

  const prompts = pausePrompts(lastRunEnd);
  const isOpen = prompts.length > 0 && !answered.has(lastRunEnd.id);
  return isOpen ? { pauseEventId: lastRunEnd.id, prompts } : undefined;
};
