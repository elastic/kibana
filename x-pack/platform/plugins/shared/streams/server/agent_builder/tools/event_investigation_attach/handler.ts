/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SigEventInvestigationResultStatus } from '@kbn/streams-schema';
import { attachInvestigationToEvent } from '../../../lib/sig_events/events/attach_investigation';
import type { EventClient } from '../../../lib/sig_events/events';

export const attachEventInvestigationToolHandler = async ({
  eventClient,
  eventId,
  workflowExecutionId,
  resultStatus,
  completedDate,
}: {
  eventClient: EventClient;
  eventId: string;
  workflowExecutionId: string;
  resultStatus: SigEventInvestigationResultStatus;
  completedDate: string;
}): Promise<{ event_id: string; updated: number; ignored: number }> => {
  return attachInvestigationToEvent({
    eventClient,
    eventId,
    investigation: {
      workflow_execution_id: workflowExecutionId,
      result_status: resultStatus,
      completed_date: completedDate,
    },
  });
};
