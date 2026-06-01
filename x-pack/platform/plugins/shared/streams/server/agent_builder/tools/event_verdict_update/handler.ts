/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SigEventVerdict } from '@kbn/streams-schema';
import type { EventClient } from '../../../lib/sig_events/events';

export async function updateEventVerdictToolHandler({
  eventClient,
  eventId,
  verdict,
}: {
  eventClient: EventClient;
  eventId: string;
  verdict: SigEventVerdict;
}): Promise<{ event_id: string; updated: number; ignored: number; verdict: SigEventVerdict }> {
  const { hits } = await eventClient.findById(eventId);
  const latest = hits[hits.length - 1];

  if (!latest || latest.verdict === verdict) {
    return { event_id: eventId, updated: 0, ignored: 1, verdict };
  }

  const now = new Date().toISOString();
  const updatedEvent = {
    ...latest,
    '@timestamp': now,
    created_at: now,
    event_id: uuidv4(),
    previous_event_id: latest.event_id,
    verdict,
    verdict_id: uuidv4(),
  };

  await eventClient.bulkCreate([updatedEvent]);

  return { event_id: eventId, updated: 1, ignored: 0, verdict };
}
