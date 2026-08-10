/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { attachInvestigationToEvent } from '../../../lib/significant_events/events/attach_investigation';
import type { EventClient } from '../../../lib/significant_events/events';

export const attachEventInvestigationToolHandler = async ({
  eventClient,
  eventUuid,
  workflowExecutionId,
  startedAt,
  completedAt,
}: {
  eventClient: EventClient;
  eventUuid: string;
  workflowExecutionId: string;
  startedAt: string;
  completedAt?: string;
}): Promise<{ event_uuid: string; updated: number; ignored: number }> => {
  return attachInvestigationToEvent({
    eventClient,
    eventUuid,
    investigation: {
      workflow_execution_id: workflowExecutionId,
      started_at: startedAt,
      completed_at: completedAt,
    },
  });
};
