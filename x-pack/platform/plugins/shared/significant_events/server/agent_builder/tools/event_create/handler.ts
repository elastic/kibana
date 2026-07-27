/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventClient } from '../../../lib/significant_events/events';
import { eventsWriteHandler, type EventsWriteInput } from '../event_write/handler';

/**
 * Chat-initiated event input — a minimal subset of EventsWriteInput.
 *
 * `event_id` is absent: eventsWriteHandler generates a synthetic one automatically.
 * `status` is optional: defaults to 'open' when omitted.
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
      status: eventInput.status ?? 'open',
    },
  });
  return { event_uuid: result.event_uuid, acknowledged: true };
}
