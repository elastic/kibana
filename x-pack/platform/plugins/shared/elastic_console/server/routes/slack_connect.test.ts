/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServiceMock, httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { registerSlackConnectRoute } from './slack_connect';

const mockLogger = loggingSystemMock.create().get();

const KIBANA_URL = 'https://kibana.example.com';
const CLIENT_ID = 'test-client-id';

const createMocks = (overrides?: { invalidateError?: Error; createApiKeyError?: Error }) => {
  const mockInvalidate = jest.fn().mockResolvedValue({});
  if (overrides?.invalidateError) {
    mockInvalidate.mockRejectedValue(overrides.invalidateError);
  }

  const mockCreateApiKey = jest.fn().mockResolvedValue({
    id: 'connect-key-id',
    api_key: 'connect-secret',
  });
  if (overrides?.createApiKeyError) {
    mockCreateApiKey.mockRejectedValue(overrides.createApiKeyError);
  }

  const coreSetup = {
    getStartServices: jest.fn().mockResolvedValue([
      {
        elasticsearch: {
          client: {
            asScoped: jest.fn().mockReturnValue({
              asCurrentUser: {
                security: {
                  invalidateApiKey: mockInvalidate,
                  createApiKey: mockCreateApiKey,
                },
              },
            }),
          },
        },
        http: {
          basePath: { publicBaseUrl: KIBANA_URL, serverBasePath: '' },
          getServerInfo: jest.fn().mockReturnValue({ protocol: 'https', port: 5601 }),
        },
      },
    ]),
  };

  return { coreSetup, mockInvalidate, mockCreateApiKey };
};

describe('registerSlackConnectRoute — reconnect flow', () => {
  let router: ReturnType<typeof httpServiceMock.createRouter>;

  const registerAndGetHandler = (
    coreSetup: unknown,
    config = { slack: { client_id: CLIENT_ID } }
  ) => {
    router = httpServiceMock.createRouter();
    registerSlackConnectRoute({
      router,
      coreSetup: coreSetup as never,
      logger: mockLogger,
      config: config as never,
    });
    const [, handler] = router.get.mock.calls[0];
    return handler;
  };

  const callHandler = async (handler: Function) => {
    const response = httpServerMock.createResponseFactory();
    await handler({} as never, httpServerMock.createKibanaRequest(), response);
    return response;
  };

  it('invalidates old connect keys before creating a new one', async () => {
    const { coreSetup, mockInvalidate, mockCreateApiKey } = createMocks();
    const handler = registerAndGetHandler(coreSetup);

    const callOrder: string[] = [];
    mockInvalidate.mockImplementation(async () => {
      callOrder.push('invalidate');
    });
    mockCreateApiKey.mockImplementation(async () => {
      callOrder.push('create');
      return { id: 'connect-key-id', api_key: 'connect-secret' };
    });

    await callHandler(handler);

    expect(callOrder).toEqual(['invalidate', 'create']);
    expect(mockInvalidate).toHaveBeenCalledWith({ name: 'elastic-console-slack-connect-*' });
  });

  it('does not invalidate inference keys (scoped to connect prefix only)', async () => {
    const { coreSetup, mockInvalidate } = createMocks();
    const handler = registerAndGetHandler(coreSetup);

    await callHandler(handler);

    expect(mockInvalidate.mock.calls).toHaveLength(1);
    expect(mockInvalidate.mock.calls[0][0].name).toBe('elastic-console-slack-connect-*');
  });

  it('continues and creates a new key even when invalidation throws (stale key gone)', async () => {
    const { coreSetup, mockCreateApiKey } = createMocks({
      invalidateError: new Error('security_exception'),
    });
    const handler = registerAndGetHandler(coreSetup);

    const response = await callHandler(handler);

    expect(response.ok).toHaveBeenCalled();
    expect(mockCreateApiKey).toHaveBeenCalled();
  });

  it('returns a Slack OAuth URL containing the JWT state', async () => {
    const { coreSetup } = createMocks();
    const handler = registerAndGetHandler(coreSetup);

    const response = await callHandler(handler);

    expect(response.ok).toHaveBeenCalledWith(
      expect.objectContaining({ body: expect.objectContaining({ url: expect.any(String) }) })
    );

    const { url } = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(url).toContain('https://slack.com/oauth/v2/authorize');
    expect(url).toContain(`client_id=${CLIENT_ID}`);

    // state is a 3-part JWT
    const state = new URLSearchParams(new URL(url).search).get('state')!;
    const parts = state.split('.');
    expect(parts).toHaveLength(3);

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
    expect(payload).toMatchObject({
      kibana_url: KIBANA_URL,
      kibana_api_key: expect.any(String),
      exp: expect.any(Number),
    });
  });

  it('JWT expires approximately 10 minutes from now', async () => {
    const { coreSetup } = createMocks();
    const handler = registerAndGetHandler(coreSetup);

    const before = Math.floor(Date.now() / 1000);
    const response = await callHandler(handler);
    const after = Math.floor(Date.now() / 1000);

    const { url } = (response.ok as jest.Mock).mock.calls[0][0].body;
    const state = new URLSearchParams(new URL(url).search).get('state')!;
    const payload = JSON.parse(Buffer.from(state.split('.')[1], 'base64url').toString('utf8'));

    expect(payload.exp).toBeGreaterThanOrEqual(before + 600);
    expect(payload.exp).toBeLessThanOrEqual(after + 600);
  });

  it('returns 400 when client_id is not configured', async () => {
    const { coreSetup } = createMocks();
    const handler = registerAndGetHandler(coreSetup, { slack: undefined } as never);

    const response = await callHandler(handler);

    expect(response.badRequest).toHaveBeenCalled();
  });

  it('returns 500 when API key creation fails', async () => {
    const { coreSetup } = createMocks({ createApiKeyError: new Error('cluster error') });
    const handler = registerAndGetHandler(coreSetup);

    const response = await callHandler(handler);

    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 500 })
    );
  });

  it('uses the configured redirect_uri when provided', async () => {
    const { coreSetup } = createMocks();
    const config = { slack: { client_id: CLIENT_ID, redirect_uri: 'https://my.router/redirect' } };
    const handler = registerAndGetHandler(coreSetup, config as never);

    const response = await callHandler(handler);

    const { url } = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(url).toContain('redirect_uri=https%3A%2F%2Fmy.router%2Fredirect');
  });

  it('falls back to default redirect_uri when not configured', async () => {
    const { coreSetup } = createMocks();
    const handler = registerAndGetHandler(coreSetup);

    const response = await callHandler(handler);

    const { url } = (response.ok as jest.Mock).mock.calls[0][0].body;
    expect(url).toContain('connect.elastic.co');
  });

  it('registers a GET route at the correct path', () => {
    const { coreSetup } = createMocks();
    registerAndGetHandler(coreSetup);
    expect(router.get.mock.calls[0][0].path).toBe('/internal/elastic_console/slack/connect');
  });
});
