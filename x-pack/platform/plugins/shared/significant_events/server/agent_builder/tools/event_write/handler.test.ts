/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventsWriteHandler, type EventsWriteInput } from './handler';

const baseInput: EventsWriteInput = {
  discovery_id: 'disc-1',
  status: 'open',
  stream_names: ['logs.checkout'],
  title: 'Checkout latency',
  symptom_hypothesis: 'Checkout requests are delayed because the payment dependency is timing out.',
  summary: 'P99 latency breached SLO',
  severity: '60-high',
  confidence: 0.82,
  assessment_note: 'Verified via execute_esql',
  signals: [],
  causal_features: [],
  blast_radius: [],
};

describe('eventsWriteHandler', () => {
  it('writes a new event', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(eventClient.bulkCreate.mock.calls[0][0][0].symptom_hypothesis).toBe(
      baseInput.symptom_hypothesis
    );
    expect(result.written).toBe(true);
    expect(result.event_id).toBe('checkout__latency-abc12345');
    expect(result.status).toBe('open');
    expect(typeof result.event_uuid).toBe('string');
  });

  it('skips dedup lookup when event_id is absent', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn(),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput },
    });

    expect(eventClient.findLatestByEventIds).not.toHaveBeenCalled();
    expect(result.written).toBe(true);
    expect(result.event_id).toMatch(/^agent-event-[a-f0-9]{8}$/);
  });

  it('sets previous_event_uuid from the latest event returned by findLatestByEventIds', async () => {
    const eventClient = {
      findLatestByEventIds: jest
        .fn()
        .mockResolvedValue(
          new Map([['checkout__latency-abc12345', { event_uuid: 'latest-id', status: 'closed' }]])
        ),
      bulkCreate: jest.fn().mockResolvedValue(undefined),
    };

    const result = await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345', status: 'open' },
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    const written = eventClient.bulkCreate.mock.calls[0][0][0];
    expect(written.previous_event_uuid).toBe('latest-id');
    expect(result.written).toBe(true);
  });
});
