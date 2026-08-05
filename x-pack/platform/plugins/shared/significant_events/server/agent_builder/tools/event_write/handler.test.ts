/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { eventsWriteBulkHandler, eventsWriteHandler, type EventsWriteInput } from './handler';

const successfulBulkCreate = async (documents: object[]) => ({
  errors: false,
  items: documents.map(() => ({ create: { status: 201, result: 'created' } })),
});

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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
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

  it('skips latest-version lookup when event_id is absent', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn(),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
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
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
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

  it('writes with refresh wait_for so an immediate triage _count can see the event', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    expect(eventClient.bulkCreate.mock.calls[0][1]).toEqual({
      throwOnFail: false,
      refresh: 'wait_for',
    });
  });

  it('carries the investigations lineage forward from the latest event on re-open', async () => {
    const investigations = [
      { workflow_execution_id: 'wf-1', started_at: '2024-01-01T00:00:00.000Z' },
    ];
    const eventClient = {
      findLatestByEventIds: jest
        .fn()
        .mockResolvedValue(
          new Map([['checkout__latency-abc12345', { event_uuid: 'latest-id', investigations }]])
        ),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    const written = eventClient.bulkCreate.mock.calls[0][0][0];
    expect(written.investigations).toEqual(investigations);
  });

  it('leaves investigations undefined when the latest event has none', async () => {
    const eventClient = {
      findLatestByEventIds: jest
        .fn()
        .mockResolvedValue(new Map([['checkout__latency-abc12345', { event_uuid: 'latest-id' }]])),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    await eventsWriteHandler({
      eventClient: eventClient as never,
      input: { ...baseInput, event_id: 'checkout__latency-abc12345' },
    });

    const written = eventClient.bulkCreate.mock.calls[0][0][0];
    expect(written.investigations).toBeUndefined();
  });
});

describe('eventsWriteBulkHandler', () => {
  it('writes unique event ids with one lookup and one bulk request', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      bulkCreate: jest.fn().mockImplementation(successfulBulkCreate),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [
        { ...baseInput, event_id: 'event-1' },
        { ...baseInput, event_id: 'event-2', status: 'closed' },
      ],
    });

    expect(eventClient.findLatestByEventIds).toHaveBeenCalledWith(['event-1', 'event-2']);
    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(eventClient.bulkCreate.mock.calls[0][0]).toHaveLength(2);
    expect(results).toEqual([
      expect.objectContaining({ index: 0, event_id: 'event-1', written: true }),
      expect.objectContaining({ index: 1, event_id: 'event-2', written: true }),
    ]);
  });

  it('returns aligned per-item bulk failures', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      bulkCreate: jest.fn().mockResolvedValue({
        errors: true,
        items: [
          { create: { status: 201, result: 'created' } },
          {
            create: {
              status: 400,
              error: { type: 'mapper_parsing_exception', reason: 'bad field' },
            },
          },
        ],
      }),
    };

    const results = await eventsWriteBulkHandler({
      eventClient: eventClient as never,
      inputs: [
        { ...baseInput, event_id: 'event-1' },
        { ...baseInput, event_id: 'event-2' },
      ],
    });

    expect(results[0]).toEqual(expect.objectContaining({ index: 0, written: true }));
    expect(results[1]).toEqual({
      index: 1,
      event_id: 'event-2',
      status: 'open',
      written: false,
      reason: 'bulk_error',
      error: { type: 'mapper_parsing_exception', reason: 'bad field', status: 400 },
    });
  });

  it('rejects duplicate event ids before reads or writes', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn(),
      bulkCreate: jest.fn(),
    };

    await expect(
      eventsWriteBulkHandler({
        eventClient: eventClient as never,
        inputs: [
          { ...baseInput, event_id: 'duplicate' },
          { ...baseInput, event_id: 'duplicate' },
        ],
      })
    ).rejects.toMatchObject({ code: 'validation_error' });
    expect(eventClient.findLatestByEventIds).not.toHaveBeenCalled();
    expect(eventClient.bulkCreate).not.toHaveBeenCalled();
  });

  it('classifies a response cardinality mismatch as outcome unknown', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      bulkCreate: jest.fn().mockResolvedValue({ errors: false, items: [] }),
    };

    await expect(
      eventsWriteBulkHandler({
        eventClient: eventClient as never,
        inputs: [{ ...baseInput, event_id: 'event-1' }],
      })
    ).rejects.toMatchObject({ code: 'outcome_unknown' });
  });

  it('classifies a response without a create result as outcome unknown', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      bulkCreate: jest.fn().mockResolvedValue({ errors: false, items: [{}] }),
    };

    await expect(
      eventsWriteBulkHandler({
        eventClient: eventClient as never,
        inputs: [{ ...baseInput, event_id: 'event-1' }],
      })
    ).rejects.toMatchObject({ code: 'outcome_unknown' });
  });

  it('classifies a rejected bulk request as outcome unknown', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      bulkCreate: jest.fn().mockRejectedValue(new Error('connection reset')),
    };

    await expect(
      eventsWriteBulkHandler({
        eventClient: eventClient as never,
        inputs: [{ ...baseInput, event_id: 'event-1' }],
      })
    ).rejects.toMatchObject({ code: 'outcome_unknown' });
  });

  it('keeps the single-item wrapper throwing on an item failure', async () => {
    const eventClient = {
      findLatestByEventIds: jest.fn().mockResolvedValue(new Map()),
      bulkCreate: jest.fn().mockResolvedValue({
        errors: true,
        items: [
          { create: { status: 400, error: { type: 'mapper_parsing_exception', reason: 'bad' } } },
        ],
      }),
    };

    await expect(
      eventsWriteHandler({
        eventClient: eventClient as never,
        input: { ...baseInput, event_id: 'event-1' },
      })
    ).rejects.toThrow('mapper_parsing_exception: bad');
  });
});
