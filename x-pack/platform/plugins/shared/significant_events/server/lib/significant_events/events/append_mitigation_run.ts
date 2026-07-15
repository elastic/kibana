/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type {
  SignificantEventInvestigation,
  SignificantEventMitigationRun,
} from '@kbn/significant-events-schema';
import type { EventClient } from './event_client';

/**
 * Appends one mitigation decision/run to the investigation pointer identified by
 * `workflowExecutionId` on the event's latest lineage version. Called once per decision by the
 * investigation workflow's mitigation phase, and by the UI when a user manually triggers a
 * mitigation (`decision: 'manual_run'`) — unlike the attach route, which replaces the whole
 * pointer, this only ever appends to its `mitigation_runs`.
 */
export const appendMitigationRunToEvent = async ({
  eventClient,
  eventId,
  workflowExecutionId,
  mitigationRun,
}: {
  eventClient: EventClient;
  eventId: string;
  workflowExecutionId: string;
  mitigationRun: SignificantEventMitigationRun;
}): Promise<{ event_id: string; updated: number; ignored: number }> => {
  const { hits } = await eventClient.findById(eventId);
  const referenced = hits[hits.length - 1];

  if (!referenced) {
    return { event_id: eventId, updated: 0, ignored: 1 };
  }

  // Re-resolve the latest lineage version by discovery_slug — the workflow passes the frozen
  // inputs.context.event_id, which is stale by the time mitigation decisions land (the attach
  // steps have already written newer versions). Same re-resolution as attachInvestigationToEvent.
  const { hits: lineageHits } = await eventClient.findByDiscoverySlug(referenced.discovery_slug);
  const latest = lineageHits[lineageHits.length - 1] ?? referenced;

  const investigations = latest.investigations ?? [];
  const pointerIdx = investigations.findIndex(
    (entry) => entry.workflow_execution_id === workflowExecutionId
  );

  if (pointerIdx === -1) {
    return { event_id: eventId, updated: 0, ignored: 1 };
  }

  const pointer = investigations[pointerIdx];
  const existingRuns = pointer.mitigation_runs ?? [];

  const isDuplicate = existingRuns.some(
    (run) =>
      run.workflow_id === mitigationRun.workflow_id &&
      run.execution_id === mitigationRun.execution_id &&
      run.decision === mitigationRun.decision
  );
  if (isDuplicate || existingRuns.length >= 50) {
    return { event_id: eventId, updated: 0, ignored: 1 };
  }

  const updatedPointer: SignificantEventInvestigation = {
    ...pointer,
    mitigation_runs: [...existingRuns, mitigationRun],
  };

  const now = new Date().toISOString();
  const nextEventId = uuidv4();
  const updatedEvent = {
    ...latest,
    '@timestamp': now,
    created_at: now,
    event_id: nextEventId,
    previous_event_id: latest.event_id,
    investigations: investigations.map((entry, idx) =>
      idx === pointerIdx ? updatedPointer : entry
    ),
  };

  // wait_for: the workflow appends several decisions back-to-back, each re-resolving the
  // latest version — without waiting for the refresh, the next append reads a stale version
  // and the writes clobber each other (last one wins).
  await eventClient.bulkCreate([updatedEvent], { throwOnFail: true, refresh: 'wait_for' });

  return { event_id: nextEventId, updated: 1, ignored: 0 };
};
