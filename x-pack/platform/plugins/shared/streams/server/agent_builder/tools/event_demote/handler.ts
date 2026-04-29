/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EventsClient } from '../../../lib/sig_events/events/events_client';

export async function demoteEventToolHandler({
  eventsClient,
  eventId,
}: {
  eventsClient: EventsClient;
  eventId: string;
}): Promise<{ event_id: string; demoted: number; ignored: number }> {
  const result = await eventsClient.demote([eventId]);

  return {
    event_id: eventId,
    demoted: result.demoted,
    ignored: result.ignored,
  };
}
