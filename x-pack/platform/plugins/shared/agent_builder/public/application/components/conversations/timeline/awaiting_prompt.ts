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

/**
 * Id of the `execution_terminated` event with an unanswered prompt, or undefined when there is
 * none. A single `prompt_response` closes the prompt for good, even when the resume it triggered
 * fails or is aborted: the server then marks the round `completed`, so we never re-ask.
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
      event.data.prompt_requested_event_id === promptRequestedEventId
  );
  return isClosed ? undefined : promptRequestedEventId;
};
