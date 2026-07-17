/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import { type SignificantEvent } from '@kbn/significant-events-schema';
import type { EventClient } from '../../../lib/significant_events/events';

/**
 * Input for writing a significant event document. Derived from the canonical SignificantEvent
 * schema.
 *
 * `event_id` is optional. When absent (chat-initiated path), a synthetic ID is generated
 * (`agent-event-<uuid8>`) and the dedup lookup is skipped.
 *
 * `conversation_id` is the only addition not in the base schema — passed through for traceability.
 */
export type EventsWriteInput = Pick<
  SignificantEvent,
  | 'discovery_id'
  | 'status'
  | 'stream_names'
  | 'title'
  | 'symptom_hypothesis'
  | 'summary'
  | 'severity'
  | 'confidence'
  | 'assessment_note'
  | 'signals'
  | 'causal_features'
  | 'blast_radius'
  | 'workflow_execution_id'
> & {
  /** Optional — generated as `agent-event-<uuid8>` when absent (chat-initiated path). */
  event_id?: string;
  /** Not in the base SignificantEvent schema — passed through for traceability. */
  conversation_id?: string;
};

export interface EventsWriteResult {
  event_uuid: string;
  event_id: string;
  status: SignificantEvent['status'];
  written: boolean;
  reason?: string;
}

export async function eventsWriteHandler({
  eventClient,
  input,
}: {
  eventClient: EventClient;
  input: EventsWriteInput;
}): Promise<EventsWriteResult> {
  // Generate a synthetic event ID when no discovery event is linked.
  // Synthetic IDs are always new — skip the dedup lookup.
  const eventId = input.event_id || `agent-event-${uuidv4().slice(0, 8)}`;
  const isSynthetic = !input.event_id;

  const latestEvent = isSynthetic
    ? null
    : (await eventClient.findLatestByEventIds([eventId])).get(eventId);

  const now = new Date().toISOString();
  const eventUuid = uuidv4();

  // `wait_for` so the immediate triage `_count` after events_write returns can see this version.
  await eventClient.bulkCreate(
    [
      {
        ...input,
        '@timestamp': now,
        event_uuid: eventUuid,
        event_id: eventId,
        previous_event_uuid: latestEvent?.event_uuid,
        severity: input.severity,
        // Carry the investigations lineage forward so a re-open (new version) keeps the
        // investigations already attached to the episode. Triage relies on this to skip
        // re-investigating an event that has been investigated before. Closing via
        // update_event_status already spreads `...latest`, so it carries them too; the UI
        // attach path writes this field via attachInvestigationToEvent.
        investigations: latestEvent?.investigations,
      },
    ],
    { throwOnFail: true, refresh: 'wait_for' }
  );

  return {
    event_uuid: eventUuid,
    event_id: eventId,
    status: input.status,
    written: true,
  };
}
