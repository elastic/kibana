/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SignificantEventStatus } from '@kbn/significant-events-schema';
import { updateSignificantEventStatus } from '../../../lib/significant_events/events/update_event_status';
import type { EventClient } from '../../../lib/significant_events/events';

export async function updateEventStatusToolHandler({
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
}> {
  return updateSignificantEventStatus({ eventClient, eventId, status });
}
