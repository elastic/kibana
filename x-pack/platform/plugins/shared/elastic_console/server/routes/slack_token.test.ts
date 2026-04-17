/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerSlackTokenRoute } from './slack_token';
import { SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID } from '../lib/slack_credentials_so';

const mockLogger = loggingSystemMock.create().get();

const createMocks = (overrides?: {
  invalidateError?: Error;
  createApiKeyError?: Error;
  soCreateError?: Error;
}) => {
  const mockInvalidate = jest.fn().mockResolvedValue({});
  if (overrides?.invalidateError) {
    mockInvalidate.mockRejectedValue(overrides.invalidateError);
  }

  const mockCreateApiKey = jest.fn().mockResolvedValue({ id: 'new-key-id', api_key: 'new-secret' });
  if (overrides?.createApiKeyError) {
    mockCreateApiKey.mockRejectedValue(overrides.createApiKeyError);
  }

  const mockSoCreate = jest.fn().mockResolvedValue({});
  if (overrides?.soCreateError) {
    mockSoCreate.mockRejectedValue(overrides.soCreateError);
  }

  const coreSetup = {
    getStartServices: jest.fn().mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asInternalUser: {
              security: {
                invalidateApiKey: mockInvalidate,
                createApiKey: mockCreateApiKey,
              },
            },
          },
        },
        savedObjects: {
          getUnsafeInternalClient: jest.fn().mockReturnValue({ create: mockSoCreate }),
        },
      },
    ]),
  };

  return { coreSetup, mockInvalidate, mockCreateApiKey, mockSoCreate };
};

describe('registerSlackTokenRoute — reconnect flow', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  const registerAndGetHandler = (coreSetup: unknown) => {
    router = httpServiceMock.createRouter();
    registerSlackTokenRoute({ router, coreSetup: coreSetup as never, logger: mockLogger });
    const [, handler] = router.post.mock.calls[0];
    return handler;
  };

  const callHandler = (handler: Function, botToken = 'xoxb-new-token') => {
    const response = httpServerMock.createResponseFactory();
    const request = httpServerMock.createKibanaRequest({
      body: { bot_token: botToken },
    });
    return handler({} as never, request, response).then(() => response);
  };

  it('invalidates old inference keys before creating a new one', async () => {
    const { coreSetup, mockInvalidate, mockCreateApiKey } = createMocks();
    const handler = registerAndGetHandler(coreSetup);

    const callOrder: string[] = [];
    mockInvalidate.mockImplementation(async () => {
      callOrder.push('invalidate');
    });
    mockCreateApiKey.mockImplementation(async () => {
      callOrder.push('create');
      return { id: 'new-key-id', api_key: 'new-secret' };
    });

    await callHandler(handler);

    expect(callOrder).toEqual(['invalidate', 'create']);
    expect(mockInvalidate).toHaveBeenCalledWith({
      name: 'elastic-console-slack-inference-*',
    });
  });

  it('stores the new bot token with overwrite:true — existing SO is replaced', async () => {
    const { coreSetup, mockSoCreate } = createMocks();
    const handler = registerAndGetHandler(coreSetup);

    await callHandler(handler, 'xoxb-new-token-after-reconnect');

    expect(mockSoCreate).toHaveBeenCalledWith(
      SLACK_CREDENTIALS_SO_TYPE,
      expect.objectContaining({ bot_token: 'xoxb-new-token-after-reconnect' }),
      expect.objectContaining({ overwrite: true, id: SLACK_CREDENTIALS_SO_ID })
    );
  });

  it('stores the newly created API key in the SO', async () => {
    const { coreSetup, mockSoCreate } = createMocks();
    const handler = registerAndGetHandler(coreSetup);

    await callHandler(handler);

    const [, soAttributes] = mockSoCreate.mock.calls[0];
    const decoded = Buffer.from(soAttributes.kibana_api_key, 'base64').toString('utf8');
    expect(decoded).toBe('new-key-id:new-secret');
  });

  it('still completes reconnect even when invalidation throws (stale key already gone)', async () => {
    const { coreSetup, mockSoCreate } = createMocks({
      invalidateError: new Error('security_exception: key not found'),
    });
    const handler = registerAndGetHandler(coreSetup);

    const response = await callHandler(handler);

    // Route should succeed — old key missing is not fatal
    expect(response.ok).toHaveBeenCalledWith({ body: { ok: true } });
    expect(mockSoCreate).toHaveBeenCalled();
  });

  it('returns 500 when API key creation fails', async () => {
    const { coreSetup } = createMocks({
      createApiKeyError: new Error('cluster not available'),
    });
    const handler = registerAndGetHandler(coreSetup);

    const response = await callHandler(handler);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 })
    );
  });

  it('registers a POST route at the correct path', () => {
    const { coreSetup } = createMocks();
    registerAndGetHandler(coreSetup);
    const [routeConfig] = router.post.mock.calls[0];
    expect(routeConfig.path).toBe('/api/elastic_console/slack/token');
  });
});
