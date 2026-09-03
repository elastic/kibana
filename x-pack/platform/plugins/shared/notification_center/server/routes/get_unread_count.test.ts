/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock, httpServiceMock } from '@kbn/core/server/mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import { dataStreamServiceMock } from '@kbn/core-data-streams-server-mocks';
import {
  OVERRIDES_KEY,
  READ_ALL_BEFORE_DEFAULT,
  READ_ALL_BEFORE_KEY,
} from '../storage/user_storage';
import type { NotificationRouteDeps } from './route_deps';
import { registerGetUnreadCountRoute } from './get_unread_count';

describe('GET /internal/notification_center/notifications/_unread_count', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns 403 when the caller has no scoped user profile', async () => {
    const router = httpServiceMock.createRouter();
    const getStartServices = jest.fn().mockResolvedValue([
      {
        userStorage: { asScoped: jest.fn().mockReturnValue(undefined) },
      },
    ]);
    registerGetUnreadCountRoute({
      router,
      core: { getStartServices },
      logger: loggingSystemMock.createLogger(),
    } as unknown as NotificationRouteDeps);
    const route = router.versioned.getRoute(
      'get',
      '/internal/notification_center/notifications/_unread_count'
    );
    const handler = route.versions['1']?.handler;
    if (!handler) {
      throw new Error('Unread-count route was not registered');
    }
    const response = httpServerMock.createResponseFactory();

    await handler({} as never, httpServerMock.createKibanaRequest({ method: 'get' }), response);

    expect(response.forbidden).toHaveBeenCalledWith({
      body: { message: 'A user profile is required to read notification unread state.' },
    });
  });

  it('returns 500 when the caller read state cannot be loaded', async () => {
    const router = httpServiceMock.createRouter();
    const client = { get: jest.fn().mockRejectedValue(new Error('user storage unavailable')) };
    const getStartServices = jest.fn().mockResolvedValue([
      {
        userStorage: { asScoped: jest.fn().mockReturnValue(client) },
      },
    ]);
    registerGetUnreadCountRoute({
      router,
      core: { getStartServices },
      logger: loggingSystemMock.createLogger(),
    } as unknown as NotificationRouteDeps);
    const route = router.versioned.getRoute(
      'get',
      '/internal/notification_center/notifications/_unread_count'
    );
    const handler = route.versions['1']?.handler;
    if (!handler) {
      throw new Error('Unread-count route was not registered');
    }
    const response = httpServerMock.createResponseFactory();

    await handler({} as never, httpServerMock.createKibanaRequest({ method: 'get' }), response);

    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'Failed to read notification unread state.' },
    });
  });

  it('initializes the first-read horizon before returning the unread count', async () => {
    jest.useFakeTimers().setSystemTime(new Date('2026-07-20T00:00:00.000Z'));
    const router = httpServiceMock.createRouter();
    const client = {
      get: jest.fn(async (key: string) => (key === OVERRIDES_KEY ? {} : READ_ALL_BEFORE_DEFAULT)),
      set: jest.fn(),
    };
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _id: 'backlog-doc',
            _source: {
              notification_id: 'backlog',
              '@timestamp': '2026-07-10T00:00:00.000Z',
            },
          },
        ],
      },
    });
    const dataStreams = dataStreamServiceMock.createStartContract();
    dataStreams.initializeClient.mockResolvedValue({ search } as never);
    const getStartServices = jest.fn().mockResolvedValue([
      {
        dataStreams,
        userStorage: { asScoped: jest.fn().mockReturnValue(client) },
      },
    ]);
    registerGetUnreadCountRoute({
      router,
      core: { getStartServices },
      logger: loggingSystemMock.createLogger(),
    } as unknown as NotificationRouteDeps);
    const route = router.versioned.getRoute(
      'get',
      '/internal/notification_center/notifications/_unread_count'
    );
    const handler = route.versions['1']?.handler;
    if (!handler) {
      throw new Error('Unread-count route was not registered');
    }
    const response = httpServerMock.createResponseFactory();

    await handler({} as never, httpServerMock.createKibanaRequest({ method: 'get' }), response);

    expect(client.set).toHaveBeenCalledWith(READ_ALL_BEFORE_KEY, '2026-07-20T00:00:00.000Z');
    expect(response.ok).toHaveBeenCalledWith({ body: { unreadCount: 0 } });
  });
});
