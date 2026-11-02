/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TimelineEventType } from '@kbn/agent-builder-common';
import type { TimelineDisplayEvent } from '../../../../services/events';

/**
 * Maps each resume execution to the first execution of its round. A tool call paused for a prompt
 * ends its execution with `prompt_requested`; the human's `prompt_response` starts a fresh
 * execution (its own id) that resumes the same round. Left alone, that resume becomes a second turn,
 * splitting one logical round - and any tool group inside it - across two headers.
 *
 * The link is: resume execution -> its `prompt_response` trigger -> the trigger's
 * `prompt_requested_event_id` -> the paused execution's `execution_terminated` -> its execution id.
 * Events arrive in time order, so a chain (a round paused twice) is flattened as it is built:
 * every resume maps straight to the round's first execution. Executions absent from the map are
 * the first of their round already.
 */
export const resumeToOriginalExecutionId = (
  events: TimelineDisplayEvent[],
  eventsById: Map<string, TimelineDisplayEvent>
): Map<string, string> => {
  const links = new Map<string, string>();
  for (const event of events) {
    if (event.type !== TimelineEventType.promptResponse) {
      continue;
    }
    const originalExecutionId = eventsById.get(event.data.prompt_requested_event_id)?.execution_id;
    const resumeExecutionId = events.find(
      (candidate) => candidate.trigger_event_id === event.id && candidate.execution_id !== undefined
    )?.execution_id;
    if (originalExecutionId && resumeExecutionId && originalExecutionId !== resumeExecutionId) {
      links.set(resumeExecutionId, links.get(originalExecutionId) ?? originalExecutionId);
    }
  }
  return links;
};
