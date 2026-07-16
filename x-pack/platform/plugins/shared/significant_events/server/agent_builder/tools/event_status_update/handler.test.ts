/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateEventStatusToolHandler } from './handler';

describe('updateEventStatusToolHandler', () => {
  it('creates a new event version when status changes', async () => {
    const eventClient = {
      findById: jest.fn().mockResolvedValue({
        hits: [{ event_id: 'event-1', status: 'promoted', discovery_slug: 'slug-1' }],
      }),
      findByDiscoverySlug: jest.fn().mockResolvedValue({
        hits: [{ event_id: 'event-1', status: 'promoted', discovery_slug: 'slug-1' }],
      }),
      bulkCreate: jest.fn().mockResolvedValue({}),
    };

    const result = await updateEventStatusToolHandler({
      eventClient: eventClient as never,
      eventId: 'event-1',
      status: 'acknowledged',
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(eventClient.bulkCreate).toHaveBeenCalledWith(
      [expect.objectContaining({ status: 'acknowledged' })],
      { throwOnFail: true, refresh: 'wait_for' }
    );
    expect(result.event_id).not.toBe('event-1');
    expect(result).toEqual({
      event_id: result.event_id,
      updated: 1,
      ignored: 0,
      status: 'acknowledged',
    });
  });

  it('ignores when event is missing or status unchanged', async () => {
    const eventClientMissing = {
      findById: jest.fn().mockResolvedValue({ hits: [] }),
      findByDiscoverySlug: jest.fn(),
      bulkCreate: jest.fn(),
    };
    const missing = await updateEventStatusToolHandler({
      eventClient: eventClientMissing as never,
      eventId: 'event-1',
      status: 'demoted',
    });
    expect(missing).toEqual({ event_id: 'event-1', updated: 0, ignored: 1, status: 'demoted' });
    expect(eventClientMissing.findByDiscoverySlug).not.toHaveBeenCalled();

    const eventClientSame = {
      findById: jest.fn().mockResolvedValue({
        hits: [{ event_id: 'event-1', status: 'demoted', discovery_slug: 'slug-1' }],
      }),
      findByDiscoverySlug: jest.fn().mockResolvedValue({
        hits: [{ event_id: 'event-1', status: 'demoted', discovery_slug: 'slug-1' }],
      }),
      bulkCreate: jest.fn(),
    };
    const same = await updateEventStatusToolHandler({
      eventClient: eventClientSame as never,
      eventId: 'event-1',
      status: 'demoted',
    });
    expect(same).toEqual({ event_id: 'event-1', updated: 0, ignored: 1, status: 'demoted' });
  });
});
