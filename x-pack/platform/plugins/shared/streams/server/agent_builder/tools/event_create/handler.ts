/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SigEvent } from '@kbn/streams-schema';
import { v4 as uuidv4 } from 'uuid';
import type { EventsClient } from '../../../lib/sig_events/events/events_client';

export async function createEventToolHandler({
  eventsClient,
  eventInput,
}: {
  eventsClient: EventsClient;
  eventInput: Omit<SigEvent, 'id'>;
}): Promise<{ event: SigEvent }> {
  const event: SigEvent = {
    id: uuidv4(),
    ...eventInput,
  };

  await eventsClient.bulk([{ index: event }]);

  return { event };
}
