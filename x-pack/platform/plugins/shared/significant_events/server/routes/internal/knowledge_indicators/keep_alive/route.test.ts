/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SecurityError } from '@kbn/streams-plugin/server/lib/streams/errors/security_error';
import { internalKIKeepAliveRoutes } from './route';

jest.mock('../../../utils/assert_significant_events_access', () => ({
  assertSignificantEventsAccess: jest.fn().mockResolvedValue(undefined),
}));

const route =
  internalKIKeepAliveRoutes['POST /internal/streams/{streamName}/knowledge_indicators/_keep_alive'];
type HandlerParams = Parameters<typeof route.handler>[0];

const STREAM = 'logs.forbidden';

describe('keep alive route', () => {
  it('rejects callers without access to the stream', async () => {
    const ensureStream = jest
      .fn()
      .mockRejectedValue(new SecurityError('Cannot read stream, insufficient privileges'));
    const keepAlivePersistentIndicators = jest.fn();

    const handlerParams = {
      params: {
        path: { streamName: STREAM },
        body: { lastRefreshedBefore: '2026-01-01T00:00:00.000Z' },
      },
      request: {},
      server: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        streamsClient: { ensureStream },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ keepAlivePersistentIndicators }),
      }),
    } as unknown as HandlerParams;

    await expect(route.handler(handlerParams)).rejects.toMatchObject({
      output: { statusCode: 403 },
    });
    expect(ensureStream).toHaveBeenCalledWith(STREAM);
    expect(keepAlivePersistentIndicators).not.toHaveBeenCalled();
  });

  it('refreshes indicators for callers with access', async () => {
    const ensureStream = jest.fn().mockResolvedValue(undefined);
    const keepAlivePersistentIndicators = jest.fn().mockResolvedValue({ refreshed: 3 });

    const handlerParams = {
      params: {
        path: { streamName: STREAM },
        body: { lastRefreshedBefore: '2026-01-01T00:00:00.000Z' },
      },
      request: {},
      server: {},
      getScopedClients: jest.fn().mockResolvedValue({
        licensing: {},
        streamsClient: { ensureStream },
        getKnowledgeIndicatorClient: jest.fn().mockResolvedValue({ keepAlivePersistentIndicators }),
      }),
    } as unknown as HandlerParams;

    await expect(route.handler(handlerParams)).resolves.toEqual({ refreshed: 3 });
    expect(ensureStream).toHaveBeenCalledWith(STREAM);
  });
});
