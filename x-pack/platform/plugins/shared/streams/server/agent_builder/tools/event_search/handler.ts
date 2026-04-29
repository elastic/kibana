/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SigEvent, SigEventVerdict } from '@kbn/streams-schema';
import type { EventsClient } from '../../../lib/sig_events/events/events_client';

export async function searchEventsToolHandler({
  eventsClient,
  params,
}: {
  eventsClient: EventsClient;
  params: {
    query: string;
    stream_name: string;
    verdict?: SigEventVerdict[];
  };
}): Promise<{ events: SigEvent[] }> {
  const events = await eventsClient.find({
    query: params.query,
    streamName: params.stream_name,
    verdict: params.verdict,
  });

  return { events };
}
