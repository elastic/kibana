/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEventToolHandler } from './handler';

jest.mock('uuid', () => ({
  v4: jest.fn(() => 'generated-event-id'),
}));

describe('createEventToolHandler', () => {
  it('generates id, writes event, and returns event', async () => {
    const eventsClient = {
      bulk: jest.fn().mockResolvedValue(200),
    };

    const eventInput = {
      verdict: 'promoted' as const,
      title: 'Checkout timeout spike',
      summary: 'Spike of timeouts',
      root_cause: 'Upstream latency',
      stream_names: ['logs.checkout'],
      criticality: 0.8,
      impact: 'Checkout failures increased',
    };

    const result = await createEventToolHandler({
      eventsClient: eventsClient as never,
      eventInput,
    });

    expect(eventsClient.bulk).toHaveBeenCalledWith([
      {
        index: {
          id: 'generated-event-id',
          ...eventInput,
        },
      },
    ]);
    expect(result).toEqual({
      event: {
        id: 'generated-event-id',
        ...eventInput,
      },
    });
  });

  it('propagates bulk errors', async () => {
    const eventsClient = {
      bulk: jest.fn().mockRejectedValue(new Error('bulk failed')),
    };

    await expect(
      createEventToolHandler({
        eventsClient: eventsClient as never,
        eventInput: {
          verdict: 'promoted',
          title: 't',
          summary: 's',
          root_cause: 'r',
          stream_names: ['logs.a'],
          criticality: 0.5,
          impact: 'i',
        },
      })
    ).rejects.toThrow('bulk failed');
  });
});
