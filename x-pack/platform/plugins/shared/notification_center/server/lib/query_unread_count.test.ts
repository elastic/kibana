/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { queryUnreadCount } from './query_unread_count';

const setup = (documents: Array<{ notification_id: string; '@timestamp': string }>) => {
  const search = jest.fn().mockResolvedValue({
    hits: { hits: documents.map((source, index) => ({ _id: `doc-${index}`, _source: source })) },
  });
  const dataStreams = dataStreamServiceMock.createStartContract();
  dataStreams.initializeClient.mockResolvedValue({ search } as never);

  return {
    deps: { dataStreams, logger: loggingSystemMock.createLogger() },
    search,
  };
};

describe('queryUnreadCount', () => {
  it('counts collapsed representatives newer than the read horizon as unread', async () => {
    const { deps } = setup([
      { notification_id: 'new', '@timestamp': '2026-07-20T00:00:00.000Z' },
      { notification_id: 'old', '@timestamp': '2026-07-10T00:00:00.000Z' },
    ]);

    const result = await queryUnreadCount(deps, {
      overrides: {},
      readAllBefore: '2026-07-15T00:00:00.000Z',
    });

    expect(result).toEqual({ unreadCount: 1 });
  });

  it('caps the unread count at the 1,000-representative result limit', async () => {
    const { deps } = setup(
      Array.from({ length: 1001 }, (_, index) => ({
        notification_id: `notification-${index}`,
        '@timestamp': '2026-07-20T00:00:00.000Z',
      }))
    );

    const result = await queryUnreadCount(deps, {
      overrides: {},
      readAllBefore: '2026-07-15T00:00:00.000Z',
    });

    expect(result).toEqual({ unreadCount: 1000 });
  });

  it('fetches only the fields needed from the bounded collapsed list', async () => {
    const { deps, search } = setup([]);

    await queryUnreadCount(deps, {
      overrides: {},
      readAllBefore: '2026-07-15T00:00:00.000Z',
    });

    expect(search).toHaveBeenCalledWith({
      _source: ['notification_id', '@timestamp'],
      collapse: { field: 'notification_id' },
      sort: [{ '@timestamp': 'desc' }, { notification_id: 'asc' }],
      size: 1000,
      track_total_hits: false,
    });
  });

  it('counts overrides and re-pushes with the shared read-state semantics', async () => {
    const { deps } = setup([
      { notification_id: 'acknowledged', '@timestamp': '2026-07-10T00:00:00.000Z' },
      { notification_id: 're-pushed', '@timestamp': '2026-07-20T00:00:00.000Z' },
      { notification_id: 'explicitly-unread', '@timestamp': '2026-07-10T00:00:00.000Z' },
    ]);

    const result = await queryUnreadCount(deps, {
      overrides: {
        acknowledged: { read: true, markedAt: '2026-07-15T00:00:00.000Z' },
        're-pushed': { read: true, markedAt: '2026-07-15T00:00:00.000Z' },
        'explicitly-unread': { read: false, markedAt: '2026-07-15T00:00:00.000Z' },
      },
      readAllBefore: '2026-07-15T00:00:00.000Z',
    });

    expect(result).toEqual({ unreadCount: 2 });
  });
});
