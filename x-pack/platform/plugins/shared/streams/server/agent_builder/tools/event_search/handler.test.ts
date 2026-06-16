/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchEventsToolHandler } from './handler';

describe('searchEventsToolHandler', () => {
  it('maps params and returns events', async () => {
    const eventClient = {
      findLatestPaginated: jest.fn().mockResolvedValue({
        hits: [{ event_id: 'e1' }],
        page: 2,
        perPage: 10,
        total: 17,
      }),
    };

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { query: 'timeout', stream_name: 'logs.checkout', status: ['promoted'], page: 2 },
    });

    expect(eventClient.findLatestPaginated).toHaveBeenCalledWith({
      page: 2,
      perPage: undefined,
      search: 'timeout',
      stream: ['logs.checkout'],
      status: ['promoted'],
    });
    expect(result).toEqual({ events: [{ event_id: 'e1' }], page: 2, per_page: 10, total: 17 });
  });

  it('supports cross-stream search when stream_name is omitted', async () => {
    const eventClient = {
      findLatestPaginated: jest.fn().mockResolvedValue({
        hits: [{ event_id: 'e2' }],
        page: 1,
        perPage: 20,
        total: 1,
      }),
    };

    await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { query: 'latency', status: ['promoted'] },
    });

    expect(eventClient.findLatestPaginated).toHaveBeenCalledWith({
      page: undefined,
      perPage: undefined,
      search: 'latency',
      stream: undefined,
      status: ['promoted'],
    });
  });
});
