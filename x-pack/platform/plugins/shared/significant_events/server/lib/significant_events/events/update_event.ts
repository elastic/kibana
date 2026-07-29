/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { Severity, SignificantEventStatus } from '@kbn/significant-events-schema';
import type { EventClient } from './event_client';

export interface UpdateSignificantEventFields {
  status?: SignificantEventStatus;
  severity?: Severity;
  summary?: string;
}

/**
 * Apply a partial field patch (status/severity/summary) to a significant event, writing a new
 * append-only version. Only fields that actually differ from the current version are written.
 *
 * The returned object echoes the *requested* `fields` (not just the applied delta) for the
 * caller's convenience — `updated`/`ignored` are the source of truth: `updated: 1` means a new
 * version was written, `ignored: 1` means the request was a no-op (nothing changed) or the event
 * was not found.
 */
export const updateSignificantEvent = async ({
  eventClient,
  eventUuid,
  fields,
  workflowExecutionId,
}: {
  eventClient: EventClient;
  eventUuid: string;
  fields: UpdateSignificantEventFields;
  /**
   * Workflow execution requesting this update (e.g. the investigation workflow's
   * `apply_significant_event_updates` step), recorded on the new version as the audit trail.
   */
  workflowExecutionId?: string;
}): Promise<
  {
    event_uuid: string;
    updated: number;
    ignored: number;
  } & UpdateSignificantEventFields
> => {
  const { hits } = await eventClient.findByEventUuid(eventUuid);
  const referenced = hits[hits.length - 1];

  if (!referenced) {
    return { event_uuid: eventUuid, updated: 0, ignored: 1, ...fields };
  }

  /**
   * event_uuid is unique per append-only version; event_id is the stable lineage key.
   * Resolve the true latest version for this event_id so the update chains off the current tip
   * rather than branching as a sibling off a stale caller-supplied version (see
   * attach_investigation.ts for the same rationale).
   */
  const { hits: lineageHits } = await eventClient.findByEventId(referenced.event_id);
  const latest = lineageHits[lineageHits.length - 1] ?? referenced;

  const changed: UpdateSignificantEventFields = {};
  if (fields.status !== undefined && fields.status !== latest.status) {
    changed.status = fields.status;
  }
  if (fields.severity !== undefined && fields.severity !== latest.severity) {
    changed.severity = fields.severity;
  }
  if (fields.summary !== undefined && fields.summary !== latest.summary) {
    changed.summary = fields.summary;
  }

  if (Object.keys(changed).length === 0) {
    return { event_uuid: eventUuid, updated: 0, ignored: 1, ...fields };
  }

  const nextEventUuid = uuidv4();
  const updatedEvent = {
    ...latest,
    '@timestamp': new Date().toISOString(),
    event_uuid: nextEventUuid,
    previous_event_uuid: latest.event_uuid,
    ...changed,
    // Attribute this version to the execution that requested it — and, when the update was not
    // requested by a workflow, drop the previous version's workflow_execution_id rather than
    // misattributing a manual change to a stale execution.
    workflow_execution_id: workflowExecutionId,
  };

  // `wait_for` ensures the write is searchable before this resolves, so an immediate
  // re-fetch (e.g. the UI invalidating its query right after this route responds) sees it.
  await eventClient.bulkCreate([updatedEvent], { throwOnFail: true, refresh: 'wait_for' });

  return { event_uuid: nextEventUuid, updated: 1, ignored: 0, ...fields };
};

/**
 * Status-only convenience wrapper whose return always carries a (required) `status` — the exact
 * shape the agent-builder `event_status_update` tool handler must return. Kept separate rather
 * than inlined so that typed contract, and its tests, live in one place.
 */
export const updateSignificantEventStatus = async ({
  eventClient,
  eventUuid,
  status,
}: {
  eventClient: EventClient;
  eventUuid: string;
  status: SignificantEventStatus;
}): Promise<{
  event_uuid: string;
  updated: number;
  ignored: number;
  status: SignificantEventStatus;
}> => {
  const { event_uuid, updated, ignored } = await updateSignificantEvent({
    eventClient,
    eventUuid,
    fields: { status },
  });
  return { event_uuid, updated, ignored, status };
};
