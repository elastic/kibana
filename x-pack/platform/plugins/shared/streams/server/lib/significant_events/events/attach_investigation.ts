/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { SignificantEventInvestigation } from '@kbn/streams-schema';
import type { EventClient } from './event_client';

const optionalStringFields = [
  'conversation_id',
  'incident_conversation_id',
  'outcome',
  'current_state',
] as const;

const normalizeInvestigation = (
  investigation: SignificantEventInvestigation
): SignificantEventInvestigation => {
  const normalized = { ...investigation };

  for (const field of optionalStringFields) {
    if (normalized[field] === '') {
      delete normalized[field];
    }
  }

  return normalized;
};

export const attachInvestigationToEvent = async ({
  eventClient,
  eventId,
  investigation,
}: {
  eventClient: EventClient;
  eventId: string;
  investigation: SignificantEventInvestigation;
}): Promise<{ event_id: string; updated: number; ignored: number }> => {
  const { hits } = await eventClient.findById(eventId);
  const referenced = hits[hits.length - 1];

  if (!referenced) {
    return { event_id: eventId, updated: 0, ignored: 1 };
  }

  /**
   * event_id is unique per append-only version; discovery_slug is the stable lineage key.
   * Resolve the true latest version for this slug so pending and terminal attaches build a
   * single chain rather than branching as siblings off the same frozen caller-supplied version.
   * (The workflow passes the frozen inputs.context.event_id to both its pending and terminal
   * steps, so without this re-resolution both writes would branch off the same old version.)
   */
  const { hits: lineageHits } = await eventClient.findByDiscoverySlug(referenced.discovery_slug);
  const latest = lineageHits[lineageHits.length - 1] ?? referenced;

  const existing = latest.investigations ?? [];
  const normalizedInvestigation = normalizeInvestigation(investigation);

  // Replace-by-workflow_execution_id. Terminal workflow callbacks may only know status/timing,
  // while the initial trigger path owns the conversation linkage. Merge so those links survive.
  const existingIdx = existing.findIndex(
    (i) => i.workflow_execution_id === normalizedInvestigation.workflow_execution_id
  );

  let investigations: SignificantEventInvestigation[];
  if (existingIdx !== -1) {
    const nextInvestigation = {
      ...existing[existingIdx],
      ...normalizedInvestigation,
    };
    if (isEqual(existing[existingIdx], nextInvestigation)) {
      return { event_id: eventId, updated: 0, ignored: 1 };
    }
    investigations = existing.map((entry, idx) =>
      idx === existingIdx ? nextInvestigation : entry
    );
  } else {
    investigations = [...existing, normalizedInvestigation];
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
