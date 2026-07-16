/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { SignificantEventStatus } from '@kbn/significant-events-schema';
import type { EventClient } from './event_client';

export const updateSignificantEventStatus = async ({
  eventClient,
  eventId,
  status,
}: {
  eventClient: EventClient;
  eventId: string;
  status: SignificantEventStatus;
}): Promise<{
  event_id: string;
  updated: number;
  ignored: number;
  status: SignificantEventStatus;
}> => {
  const { hits } = await eventClient.findById(eventId);
  const referenced = hits[hits.length - 1];

  if (!referenced) {
    return { event_id: eventId, updated: 0, ignored: 1, status };
  }

  /**
   * event_id is unique per append-only version; discovery_slug is the stable lineage key.
   * Resolve the true latest version for this slug so the update chains off the current tip
   * rather than branching as a sibling off a stale caller-supplied version (see
   * attach_investigation.ts for the same rationale).
   */
  const { hits: lineageHits } = await eventClient.findByDiscoverySlug(referenced.discovery_slug);
  const latest = lineageHits[lineageHits.length - 1] ?? referenced;

  if (latest.status === status) {
    return { event_id: eventId, updated: 0, ignored: 1, status };
  }

  const nextEventId = uuidv4();
  const now = new Date().toISOString();
  const updatedEvent = {
    ...latest,
    '@timestamp': now,
    created_at: now,
    event_id: nextEventId,
    previous_event_id: latest.event_id,
    status,
  };

  // `wait_for` ensures the write is searchable before this resolves, so an immediate
  // re-fetch (e.g. the UI invalidating its query right after this route responds) sees it.
  await eventClient.bulkCreate([updatedEvent], { throwOnFail: true, refresh: 'wait_for' });

  return { event_id: nextEventId, updated: 1, ignored: 0, status };
};
