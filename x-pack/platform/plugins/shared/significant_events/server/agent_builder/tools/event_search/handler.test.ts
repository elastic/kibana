/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { searchEventsToolHandler } from './handler';

describe('searchEventsToolHandler', () => {
  const makeClient = (hits: object[] = [{ event_uuid: 'e1', severity: '60-high' }]) => ({
    findLatestByCurrentStatePaginated: jest
      .fn()
      .mockResolvedValue({ hits, page: 1, perPage: 20, total: hits.length }),
    findLatestPaginated: jest
      .fn()
      .mockResolvedValue({ hits, page: 1, perPage: 20, total: hits.length }),
  });

  it('maps params and returns events for state-scoped search', async () => {
    const eventClient = makeClient();

    const result = await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { query: 'timeout', stream_names: ['logs.checkout'], status: 'open', page: 2 },
    });

    expect(eventClient.findLatestByCurrentStatePaginated).toHaveBeenCalledWith({
      page: 2,
      perPage: undefined,
      search: 'timeout',
      stream: ['logs.checkout'],
      status: ['open'],
    });
    expect(eventClient.findLatestPaginated).not.toHaveBeenCalled();
    expect(result).toEqual({
      events: [{ event_uuid: 'e1', severity: '60-high' }],
      page: 1,
      per_page: 20,
      total: 1,
    });
  });

  it('supports cross-stream state search when stream_names is omitted', async () => {
    const eventClient = makeClient([{ event_uuid: 'e2', severity: '20-low' }]);

    await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: { status: 'closed' },
    });

    expect(eventClient.findLatestByCurrentStatePaginated).toHaveBeenCalledWith({
      page: undefined,
      perPage: undefined,
      search: undefined,
      stream: undefined,
      status: ['closed'],
    });
  });

  it('falls back to findLatestPaginated when state is omitted', async () => {
    const eventClient = makeClient();

    await searchEventsToolHandler({
      eventClient: eventClient as never,
      params: {
        stream_names: ['logs.checkout', 'logs.payment', 'logs.otel'],
      },
    });

    expect(eventClient.findLatestPaginated).toHaveBeenCalledWith(
      expect.objectContaining({ stream: ['logs.checkout', 'logs.payment', 'logs.otel'] })
    );
    expect(eventClient.findLatestByCurrentStatePaginated).not.toHaveBeenCalled();
  });
});
