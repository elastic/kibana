/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventClient } from '../../../lib/significant_events/events';
import { eventsWriteHandler, type EventsWriteInput } from '../event_write/handler';

/**
 * Chat-initiated event input — a subset of EventsWriteInput without workflow-specific fields.
 * `discovery_slug` is absent: eventsWriteHandler generates a synthetic one automatically.
 * `status` is optional (defaults to 'promoted' when omitted).
 */
export type EventCreateInput = Omit<
  EventsWriteInput,
  | 'discovery_slug'
  | 'discovery_id'
  | 'assessment_note'
  | 'evidences'
  | 'workflow_execution_id'
  | 'status'
  | 'recommendations'
> & {
  status?: EventsWriteInput['status'];
  recommendations?: EventsWriteInput['recommendations'];
};

export async function createEventToolHandler({
  eventClient,
  eventInput,
}: {
  eventClient: EventClient;
  eventInput: EventCreateInput;
}): Promise<{ event_id: string; acknowledged: true }> {
  const result = await eventsWriteHandler({
    eventClient,
    input: {
      ...eventInput,
      status: eventInput.status ?? 'promoted',
      recommendations: eventInput.recommendations ?? [],
    },
  });
  return { event_id: result.event_id, acknowledged: true };
}
