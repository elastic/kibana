/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentExecutionEvent, TimelineEvent } from '@kbn/agent-builder-common';
import { ConversationRoundStatus, isAgentExecutionEvent } from '@kbn/agent-builder-common';
import type { ProcessedTimelineEvent } from './prepare_conversation';
import { isProcessedAgentExecutionEvent } from './prepare_conversation';

/**
 * Find the last AgentExecutionEvent with `awaiting_prompt` status from timeline events.
 */
export const getPendingExecution = (
  events: TimelineEvent[] | ProcessedTimelineEvent[]
): AgentExecutionEvent | undefined => {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (
      (isAgentExecutionEvent(event as TimelineEvent) ||
        isProcessedAgentExecutionEvent(event as ProcessedTimelineEvent)) &&
      (event as AgentExecutionEvent).status === ConversationRoundStatus.awaitingPrompt
    ) {
      return event as AgentExecutionEvent;
    }
  }
  return undefined;
};
