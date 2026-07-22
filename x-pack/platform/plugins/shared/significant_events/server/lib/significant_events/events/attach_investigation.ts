/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isEqual } from 'lodash';
import { v4 as uuidv4 } from 'uuid';
import type { SignificantEventInvestigation } from '@kbn/significant-events-schema';
import type { EventClient } from './event_client';

export const attachInvestigationToEvent = async ({
  eventClient,
  eventUuid,
  investigation,
}: {
  eventClient: EventClient;
  eventUuid: string;
  investigation: SignificantEventInvestigation;
}): Promise<{ event_uuid: string; updated: number; ignored: number }> => {
  const { hits } = await eventClient.findByEventUuid(eventUuid);
  const referenced = hits[hits.length - 1];

  if (!referenced) {
    return { event_uuid: eventUuid, updated: 0, ignored: 1 };
  }

  /**
   * event_uuid is unique per append-only version; event_id is the stable lineage key.
   * Resolve the true latest version for this event so pending and terminal attaches build a
   * single chain rather than branching as siblings off the same frozen caller-supplied version.
   * (The workflow passes the frozen inputs.context.event_uuid to both its pending and terminal
   * steps, so without this re-resolution both writes would branch off the same old version.)
   */
  const { hits: lineageHits } = await eventClient.findByEventId(referenced.event_id);
  const latest = lineageHits[lineageHits.length - 1] ?? referenced;

  const existing = latest.investigations ?? [];
  const now = new Date().toISOString();

  /**
   * cancel-in-progress (keyed on event_id, max 1) guarantees only one run per event is ever
   * active, so any *other* entry still without a `completed_at` belongs to a superseded/cancelled
   * run that will never reach its terminal step. Stamp `completed_at` so it stops driving the
   * "Running" UI state (hasRunningInvestigation) and the flyout's 5s poll loop. There's no status
   * to resolve here — the workflow execution document is the source of truth for what actually
   * happened to that run.
   */
  const reconciled = existing.map((entry) =>
    entry.workflow_execution_id !== investigation.workflow_execution_id &&
    entry.completed_at == null
      ? { ...entry, completed_at: now }
      : entry
  );

  // Replace-by-workflow_execution_id: callers always send the full investigation object.
  const existingIdx = reconciled.findIndex(
    (i) => i.workflow_execution_id === investigation.workflow_execution_id
  );

  let investigations: SignificantEventInvestigation[];
  if (existingIdx !== -1) {
    investigations = reconciled.map((entry, idx) => (idx === existingIdx ? investigation : entry));
  } else if (reconciled.length < 100) {
    investigations = [...reconciled, investigation];
  } else {
    // At the schema-enforced 100-entry cap; still write any reconciliation changes but
    // cannot append a new entry without exceeding investigations.max(100).
    investigations = reconciled;
  }

  if (isEqual(investigations, existing)) {
    return { event_uuid: eventUuid, updated: 0, ignored: 1 };
  }

  const nextEventUuid = uuidv4();
  const updatedEvent = {
    ...latest,
    '@timestamp': now,
    event_uuid: nextEventUuid,
    previous_event_uuid: latest.event_uuid,
    investigations,
  };

  await eventClient.bulkCreate([updatedEvent], { throwOnFail: true });

  return { event_uuid: nextEventUuid, updated: 1, ignored: 0 };
};
