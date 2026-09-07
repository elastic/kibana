/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';
import type { EventClient } from '../../../lib/significant_events/events';
import { eventsWriteHandler, type EventsWriteInput } from '../event_write/handler';
import { createBulkWriteOutcomeUnknownError } from '../bulk_write';

/**
 * Chat-initiated event input — a minimal subset of EventsWriteInput.
 *
 * Always-write snapshot: a generated `event_id` is supplied so find-or-create does not
 * collapse chat creates onto an existing same-stream event. `status` defaults to 'open'.
 */
export type EventCreateInput = Pick<
  EventsWriteInput,
  'title' | 'symptom_hypothesis' | 'summary' | 'stream_names' | 'severity' | 'confidence'
> & {
  status?: EventsWriteInput['status'];
};

export async function createEventToolHandler({
  eventClient,
  eventInput,
}: {
  eventClient: EventClient;
  eventInput: EventCreateInput;
}): Promise<{ event_uuid: string; acknowledged: true }> {
  const result = await eventsWriteHandler({
    eventClient,
    input: {
      ...eventInput,
      event_id: uuidv4(),
      status: eventInput.status ?? 'open',
    },
  });
  if (!result.written) {
    throw createBulkWriteOutcomeUnknownError(
      `Event write skipped (${result.reason}): event_id=${result.event_id}`
    );
  }
  return { event_uuid: result.event_uuid, acknowledged: true };
}
