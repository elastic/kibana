/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { firstValueFrom } from 'rxjs';
import type { SignificantEvent } from '@kbn/significant-events-schema';
import { FocusedSignificantEventService } from './focused_significant_event_service';

const getFocusedEvent = (service: FocusedSignificantEventService) =>
  firstValueFrom(service.focusedEvent$);

const createEvent = (eventId: string): SignificantEvent => ({
  '@timestamp': '2026-01-01T00:00:00.000Z',
  event_uuid: `event-${eventId}`,
  event_id: eventId,
  stream_names: ['logs.payment'],
  title: `Event ${eventId}`,
  summary: 'Summary',
  symptom_hypothesis: 'Root cause',
  severity: '60-high',
  confidence: 0.8,
  status: 'open',
});

describe('FocusedSignificantEventService', () => {
  it('stores and clears the focused event', async () => {
    const service = new FocusedSignificantEventService();
    const event = createEvent('payment-outage');

    service.setFocusedEvent(event);

    expect(await getFocusedEvent(service)).toBe(event);

    service.clearFocusedEvent('payment-outage');

    expect(await getFocusedEvent(service)).toBeUndefined();
  });

  it('does not clear a newer focused event with an older event id', async () => {
    const service = new FocusedSignificantEventService();
    const firstEvent = createEvent('first-event');
    const secondEvent = createEvent('second-event');

    service.setFocusedEvent(firstEvent);
    service.setFocusedEvent(secondEvent);
    service.clearFocusedEvent('first-event');

    expect(await getFocusedEvent(service)).toBe(secondEvent);
  });
});
