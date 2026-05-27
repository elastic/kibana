/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateEventVerdictToolHandler } from './handler';

describe('updateEventVerdictToolHandler', () => {
  it('creates a new event version when verdict changes', async () => {
    const eventClient = {
      findById: jest.fn().mockResolvedValue({
        hits: [{ event_id: 'event-1', verdict: 'promoted' }],
      }),
      bulkCreate: jest.fn().mockResolvedValue({}),
    };

    const result = await updateEventVerdictToolHandler({
      eventClient: eventClient as never,
      eventId: 'event-1',
      verdict: 'acknowledged',
    });

    expect(eventClient.bulkCreate).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      event_id: 'event-1',
      updated: 1,
      ignored: 0,
      verdict: 'acknowledged',
    });
  });

  it('ignores when event is missing or verdict unchanged', async () => {
    const eventClientMissing = {
      findById: jest.fn().mockResolvedValue({ hits: [] }),
      bulkCreate: jest.fn(),
    };
    const missing = await updateEventVerdictToolHandler({
      eventClient: eventClientMissing as never,
      eventId: 'event-1',
      verdict: 'demoted',
    });
    expect(missing).toEqual({ event_id: 'event-1', updated: 0, ignored: 1, verdict: 'demoted' });

    const eventClientSame = {
      findById: jest
        .fn()
        .mockResolvedValue({ hits: [{ event_id: 'event-1', verdict: 'demoted' }] }),
      bulkCreate: jest.fn(),
    };
    const same = await updateEventVerdictToolHandler({
      eventClient: eventClientSame as never,
      eventId: 'event-1',
      verdict: 'demoted',
    });
    expect(same).toEqual({ event_id: 'event-1', updated: 0, ignored: 1, verdict: 'demoted' });
  });
});
