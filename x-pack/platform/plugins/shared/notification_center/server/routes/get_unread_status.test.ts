/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import type { IUserStorageClient } from '@kbn/core-user-storage-common';
import {
  OVERRIDES_KEY,
  READ_ALL_BEFORE_DEFAULT,
  READ_ALL_BEFORE_KEY,
} from '../storage/user_storage';
import { UnreadStatusService } from '../lib/query_unread_status';
import { ReadStateService } from '../lib/read_state';
import { GetUnreadStatusRoute } from './get_unread_status';

const createRoute = (client: IUserStorageClient | null) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const response = httpServerMock.createResponseFactory();
  const route = new GetUnreadStatusRoute(
    new UnreadStatusService(esClient, logger),
    new ReadStateService(client, logger),
    response
  );

  return { route, response, search: esClient.search };
};

const createClient = (overrides: Record<string, jest.Mock> = {}) =>
  ({ get: jest.fn(), set: jest.fn(), ...overrides } as unknown as IUserStorageClient);

describe('GetUnreadStatusRoute', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 403 when the caller has no scoped user profile', async () => {
    const { route, response } = createRoute(null);

    await route.handle();

    expect(response.forbidden).toHaveBeenCalledWith({
      body: { message: 'A user profile is required to check unread status.' },
    });
  });

  it('returns 500 when the caller read state cannot be loaded', async () => {
    const client = createClient({
      get: jest.fn().mockRejectedValue(new Error('user storage unavailable')),
    });
    const { route, response } = createRoute(client);

    await route.handle();

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to load unread status.' },
    });
  });

  it('initializes the first-read horizon before returning the unread status', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-20T00:00:00.000Z'));
    const client = createClient({
      get: jest.fn(async (key: string) => (key === OVERRIDES_KEY ? {} : READ_ALL_BEFORE_DEFAULT)),
    });
    const { route, response, search } = createRoute(client);
    search.mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'backlog-doc',
            _source: { notification_id: 'backlog', '@timestamp': '2026-07-10T00:00:00.000Z' },
          },
        ],
      },
    } as never);

    await route.handle();

    expect(client.set).toHaveBeenCalledWith(READ_ALL_BEFORE_KEY, '2026-07-20T00:00:00.000Z');
    expect(response.ok).toHaveBeenCalledWith({ body: { hasUnread: false } });
  });
});
