/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { demoteEventToolHandler } from './handler';

describe('demoteEventToolHandler', () => {
  it('demotes a single event and maps response', async () => {
    const eventsClient = {
      demote: jest.fn().mockResolvedValue({ demoted: 1, ignored: 0 }),
    };

    const result = await demoteEventToolHandler({
      eventsClient: eventsClient as never,
      eventId: 'event-1',
    });

    expect(eventsClient.demote).toHaveBeenCalledWith(['event-1']);
    expect(result).toEqual({ event_id: 'event-1', demoted: 1, ignored: 0 });
  });

  it('propagates client errors', async () => {
    const eventsClient = {
      demote: jest.fn().mockRejectedValue(new Error('boom')),
    };

    await expect(
      demoteEventToolHandler({
        eventsClient: eventsClient as never,
        eventId: 'event-2',
      })
    ).rejects.toThrow('boom');
  });
});
