/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventInvestigationStatus } from '@kbn/streams-schema';
import { attachInvestigationToEvent } from '../../../lib/significant_events/events/attach_investigation';
import type { EventClient } from '../../../lib/significant_events/events';

export const attachEventInvestigationToolHandler = async ({
  eventClient,
  eventId,
  workflowExecutionId,
  status,
  startedAt,
  completedAt,
  conversationId,
  incidentConversationId,
  outcome,
  currentState,
}: {
  eventClient: EventClient;
  eventId: string;
  workflowExecutionId: string;
  status: SignificantEventInvestigationStatus;
  startedAt: string;
  completedAt?: string;
  conversationId?: string;
  incidentConversationId?: string;
  outcome?: string;
  currentState?: string;
}): Promise<{ event_id: string; updated: number; ignored: number }> => {
  return attachInvestigationToEvent({
    eventClient,
    eventId,
    investigation: {
      workflow_execution_id: workflowExecutionId,
      status,
      started_at: startedAt,
      completed_at: completedAt,
      conversation_id: conversationId,
      incident_conversation_id: incidentConversationId,
      outcome,
      current_state: currentState,
    },
  });
};
