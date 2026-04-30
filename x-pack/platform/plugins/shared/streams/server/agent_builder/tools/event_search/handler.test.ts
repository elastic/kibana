/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchEventsToolHandler } from './handler';

describe('searchEventsToolHandler', () => {
  it('maps params and returns events', async () => {
    const events = [{ id: 'e1' }, { id: 'e2' }];
    const eventsClient = {
      find: jest.fn().mockResolvedValue(events),
    };

    const result = await searchEventsToolHandler({
      eventsClient: eventsClient as never,
      params: {
        query: 'timeout spike',
        stream_name: 'logs.checkout',
        verdict: ['promoted'],
      },
    });

    expect(eventsClient.find).toHaveBeenCalledWith({
      query: 'timeout spike',
      streamName: 'logs.checkout',
      verdict: ['promoted'],
    });
    expect(result).toEqual({ events });
  });

  it('passes undefined verdict when omitted', async () => {
    const eventsClient = {
      find: jest.fn().mockResolvedValue([]),
    };

    await searchEventsToolHandler({
      eventsClient: eventsClient as never,
      params: {
        query: 'latency',
        stream_name: 'logs.payment',
      },
    });

    expect(eventsClient.find).toHaveBeenCalledWith({
      query: 'latency',
      streamName: 'logs.payment',
      verdict: undefined,
    });
  });
});
