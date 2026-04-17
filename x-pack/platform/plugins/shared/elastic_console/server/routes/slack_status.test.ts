/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerSlackStatusRoute } from './slack_status';
import { SLACK_CREDENTIALS_SO_TYPE, SLACK_CREDENTIALS_SO_ID } from '../lib/slack_credentials_so';

const mockLogger = loggingSystemMock.create().get();

const KEY_ID = 'test-key-id';
const API_KEY_SECRET = 'test-secret';
const KIBANA_API_KEY = Buffer.from(`${KEY_ID}:${API_KEY_SECRET}`).toString('base64');
const CONNECTED_AT = '2026-03-20T00:00:00.000Z';

const createMockEsoClient = (overrides?: Partial<{ getDecryptedAsInternalUser: jest.Mock }>) => ({
  getDecryptedAsInternalUser: jest.fn().mockResolvedValue({
    attributes: {
      bot_token: 'xoxb-test',
      kibana_api_key: KIBANA_API_KEY,
      updated_at: CONNECTED_AT,
    },
  }),
  ...overrides,
});

const createMockCoreSetup = (esoClient = createMockEsoClient(), getApiKeyResult?: unknown) => ({
  getStartServices: jest.fn().mockResolvedValue([
    {
      elasticsearch: {
        client: {
          asInternalUser: {
            security: {
              getApiKey: jest.fn().mockResolvedValue(
                getApiKeyResult ?? {
                  api_keys: [{ id: KEY_ID, invalidated: false }],
                }
              ),
            },
          },
        },
      },
    },
    {
      encryptedSavedObjects: {
        getClient: jest.fn().mockReturnValue(esoClient),
      },
    },
  ]),
});

describe('registerSlackStatusRoute', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  const registerAndGetHandler = (coreSetup = createMockCoreSetup()) => {
    router = httpServiceMock.createRouter();
    registerSlackStatusRoute({ router, coreSetup: coreSetup as never, logger: mockLogger });
    const [, handler] = router.get.mock.calls[0];
    return { handler, coreSetup };
  };

  const callHandler = (handler: Function) => {
    const ctx = {} as never;
    const request = httpServerMock.createKibanaRequest();
    const response = httpServerMock.createResponseFactory();
    return handler(ctx, request, response);
  };

  it('returns not_connected when no credentials SO exists', async () => {
    const esoClient = createMockEsoClient({
      getDecryptedAsInternalUser: jest.fn().mockRejectedValue(new Error('Not found')),
    });
    const { handler } = registerAndGetHandler(createMockCoreSetup(esoClient));

    const response = httpServerMock.createResponseFactory();
    await handler({} as never, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({ body: { status: 'not_connected' } });
  });

  it('returns connected when credentials exist and API key is valid', async () => {
    const { handler } = registerAndGetHandler();

    const response = httpServerMock.createResponseFactory();
    await handler({} as never, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { status: 'connected', connected_at: CONNECTED_AT },
    });
  });

  it('returns disconnected when API key is invalidated', async () => {
    const coreSetup = createMockCoreSetup(createMockEsoClient(), {
      api_keys: [{ id: KEY_ID, invalidated: true }],
    });
    const { handler } = registerAndGetHandler(coreSetup);

    const response = httpServerMock.createResponseFactory();
    await handler({} as never, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { status: 'disconnected', connected_at: CONNECTED_AT },
    });
  });

  it('returns disconnected when getApiKey throws (key gone)', async () => {
    const coreSetup = {
      getStartServices: jest.fn().mockResolvedValue([
        {
          elasticsearch: {
            client: {
              asInternalUser: {
                security: {
                  getApiKey: jest.fn().mockRejectedValue(new Error('security_exception')),
                },
              },
            },
          },
        },
        {
          encryptedSavedObjects: {
            getClient: jest.fn().mockReturnValue(createMockEsoClient()),
          },
        },
      ]),
    };
    const { handler } = registerAndGetHandler(coreSetup as never);

    const response = httpServerMock.createResponseFactory();
    await handler({} as never, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { status: 'disconnected', connected_at: CONNECTED_AT },
    });
  });

  it('returns disconnected when api_keys array is empty', async () => {
    const coreSetup = createMockCoreSetup(createMockEsoClient(), { api_keys: [] });
    const { handler } = registerAndGetHandler(coreSetup);

    const response = httpServerMock.createResponseFactory();
    await handler({} as never, httpServerMock.createKibanaRequest(), response);

    expect(response.ok).toHaveBeenCalledWith({
      body: { status: 'disconnected', connected_at: CONNECTED_AT },
    });
  });

  it('registers the route at the correct path', () => {
    registerAndGetHandler();
    const [routeConfig] = router.get.mock.calls[0];
    expect(routeConfig.path).toBe('/internal/elastic_console/slack/status');
  });

  it('uses the correct SO type and ID when reading credentials', async () => {
    const esoClient = createMockEsoClient();
    const { handler } = registerAndGetHandler(createMockCoreSetup(esoClient));

    await callHandler(handler);

    expect(esoClient.getDecryptedAsInternalUser).toHaveBeenCalledWith(
      SLACK_CREDENTIALS_SO_TYPE,
      SLACK_CREDENTIALS_SO_ID
    );
  });
});
