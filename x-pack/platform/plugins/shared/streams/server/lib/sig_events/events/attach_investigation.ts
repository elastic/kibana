/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SigEventInvestigation } from '@kbn/streams-schema';
import type { EventClient } from './event_client';

export const attachInvestigationToEvent = async ({
  eventClient,
  eventId,
  investigation,
}: {
  eventClient: EventClient;
  eventId: string;
  investigation: SigEventInvestigation;
}): Promise<{ event_id: string; updated: number; ignored: number }> => {
  const { hits } = await eventClient.findById(eventId);
  const latest = hits[hits.length - 1];

  if (!latest) {
    return { event_id: eventId, updated: 0, ignored: 1 };
  }

  const existing = latest.investigations ?? [];

  // Upsert by workflow_execution_id: replace an existing entry for the same
  // execution, or append if it is new. Keeps the operation idempotent when the
  // investigation workflow and the agent both try to attach the same result.
  const alreadyPresent = existing.findIndex(
    (i) => i.workflow_execution_id === investigation.workflow_execution_id
  );

  let investigations: SigEventInvestigation[];
  if (alreadyPresent !== -1) {
    if (
      existing[alreadyPresent].result_status === investigation.result_status &&
      existing[alreadyPresent].completed_date === investigation.completed_date
    ) {
      return { event_id: eventId, updated: 0, ignored: 1 };
    }
    investigations = existing.map((entry, idx) => (idx === alreadyPresent ? investigation : entry));
  } else {
    investigations = [...existing, investigation];
  }

  const nextEventId = uuidv4();
  const now = new Date().toISOString();
  const updatedEvent = {
    ...latest,
    '@timestamp': now,
    created_at: now,
    event_id: nextEventId,
    previous_event_id: latest.event_id,
    investigations,
  };

  await eventClient.bulkCreate([updatedEvent], { throwOnFail: true });

  return { event_id: nextEventId, updated: 1, ignored: 0 };
};
