/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentResponseEvent, TimelineEvent } from '@kbn/agent-builder-common';
import { ConversationRoundStatus, isAgentResponseEvent } from '@kbn/agent-builder-common';
import type { ProcessedTimelineEvent } from './prepare_conversation';
import { isProcessedAgentResponseEvent } from './prepare_conversation';

/**
 * Find the last AgentResponseEvent with `awaiting_prompt` status from timeline events.
 */
export const getPendingAgentResponse = (
  events: TimelineEvent[] | ProcessedTimelineEvent[]
): AgentResponseEvent | undefined => {
  for (let i = events.length - 1; i >= 0; i--) {
    const event = events[i];
    if (
      (isAgentResponseEvent(event as TimelineEvent) ||
        isProcessedAgentResponseEvent(event as ProcessedTimelineEvent)) &&
      (event as AgentResponseEvent).status === ConversationRoundStatus.awaitingPrompt
    ) {
      return event as AgentResponseEvent;
    }
  }
  return undefined;
};
