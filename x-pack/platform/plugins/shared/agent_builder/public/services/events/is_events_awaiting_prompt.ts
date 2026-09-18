/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineEvent, PromptResponseEvent } from '@kbn/agent-builder-common';
import { TimelineEventType } from '@kbn/agent-builder-common';

export const isEventsAwaitingPrompt = (
  events: TimelineEvent[],
  localPromptResponse?: PromptResponseEvent
): boolean => {
  let latestTerminal: TimelineEvent | undefined;
  const answeredTerminalIds = new Set<string>();
  if (localPromptResponse) {
    answeredTerminalIds.add(localPromptResponse.data.prompt_requested_event_id);
  }
  for (const event of events) {
    if (event.type === TimelineEventType.promptResponse) {
      answeredTerminalIds.add(event.data.prompt_requested_event_id);
    } else if (
      event.type === TimelineEventType.executionTerminated ||
      event.type === TimelineEventType.executionFailed ||
      event.type === TimelineEventType.executionAborted
    ) {
      latestTerminal = event;
    }
  }
  if (latestTerminal?.type !== TimelineEventType.executionTerminated) return false;
  return (
    latestTerminal.data.outcome.type === 'prompt_requested' &&
    !answeredTerminalIds.has(latestTerminal.id)
  );
};
