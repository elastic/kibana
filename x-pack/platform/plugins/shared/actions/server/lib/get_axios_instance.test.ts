/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { loggerMock } from '@kbn/logging-mocks';
import { AuthTypeRegistry, registerAuthTypes } from '../auth_types';
import { getAxiosInstanceWithAuth } from './get_axios_instance';
import { actionsConfigMock } from '../actions_config.mock';
import { getCustomAgents } from './get_custom_agents';
import { connectorTokenClientMock } from './connector_token_client.mock';
import { requestOAuthClientCredentialsToken } from './request_oauth_client_credentials_token';
import { PFX } from '@kbn/connector-specs/src/auth_types/pfx';
import type { NormalizedAuthType } from '@kbn/connector-specs';

jest.mock('./get_custom_agents', () => ({
  getCustomAgents: jest.fn().mockReturnValue({
    httpAgent: undefined,
    httpsAgent: undefined,
  }),
}));

jest.mock('./request_oauth_client_credentials_token', () => ({
  requestOAuthClientCredentialsToken: jest.fn(),
}));

let clock: sinon.SinonFakeTimers;

const logger = loggerMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

describe('getAxiosInstance', () => {
  const configurationUtilities = actionsConfigMock.create();
  const authTypeRegistry = new AuthTypeRegistry();
  registerAuthTypes(authTypeRegistry);

  // remove this when PFX is re-enabled in the exports
  authTypeRegistry.register(PFX as NormalizedAuthType);

  beforeAll(() => {
    clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
  });
  afterAll(() => clock.restore());
  beforeEach(() => {
    jest.clearAllMocks();
    clock.reset();
  });

  test('returns axios instance with no auth when no authType is specified', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({ connectorId: '1', secrets: {} });

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();
  });

  test('throws error when auth type is not supported', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    await expect(
      getAxios({ connectorId: '1', secrets: { authType: 'foo' } })
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"Auth type \\"foo\\" is not registered."`);
    expect(logger.error).toHaveBeenCalledWith(
      `Error getting configured axios instance configured for auth type "foo": Auth type "foo" is not registered. `
    );
  });

  test('returns axios instance configured for basic auth', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({
      connectorId: '1',
      secrets: { authType: 'basic', username: 'user', password: 'pass' },
    });

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toEqual({ username: 'user', password: 'pass' });

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(1);

    // @ts-expect-error
    const result2 = result!.interceptors.request.handlers[0].fulfilled({ url: 'http://test1' });
    expect(getCustomAgents).toHaveBeenCalledWith(configurationUtilities, logger, 'http://test1');
  });

  test('returns axios instance configured for bearer auth', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({
      connectorId: '1',
      secrets: { authType: 'bearer', token: 'abcdxyz' },
    });

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();
    expect(result!.defaults.headers.common).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer abcdxyz',
      })
    );

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(1);

    // @ts-expect-error
    const result2 = result!.interceptors.request.handlers[0].fulfilled({ url: 'http://test2' });
    expect(getCustomAgents).toHaveBeenCalledWith(configurationUtilities, logger, 'http://test2');
  });

  test('returns axios instance configured for api_key_header auth', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({
      connectorId: '1',
      secrets: {
        authType: 'api_key_header',
        'X-Custom-Auth': 'i-am-a-custom-auth-string',
      },
    });

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();
    expect(result!.defaults.headers.common).toEqual(
      expect.objectContaining({
        'X-Custom-Auth': 'i-am-a-custom-auth-string',
      })
    );

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(1);

    // @ts-expect-error
    const result2 = result!.interceptors.request.handlers[0].fulfilled({ url: 'http://test3' });
    expect(getCustomAgents).toHaveBeenCalledWith(configurationUtilities, logger, 'http://test3');
  });

  test('returns axios instance configured for api_key_header auth and additional headers', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({
      additionalHeaders: {
        'X-Custom-Header': 'i-am-a-custom-header-string',
        'X-Version': '1.0.0',
      },
      connectorId: '1',
      secrets: {
        authType: 'api_key_header',
        'X-Custom-Auth': 'i-am-a-custom-auth-string',
      },
    });

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();
    expect(result!.defaults.headers.common).toEqual(
      expect.objectContaining({
        'X-Custom-Header': 'i-am-a-custom-header-string',
        'X-Version': '1.0.0',
        'X-Custom-Auth': 'i-am-a-custom-auth-string',
      })
    );

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(1);

    // @ts-expect-error
    const result2 = result!.interceptors.request.handlers[0].fulfilled({ url: 'http://test3' });
    expect(getCustomAgents).toHaveBeenCalledWith(configurationUtilities, logger, 'http://test3');
  });

  test('auth type configured headers take precedence over additional headers', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({
      additionalHeaders: {
        'X-Custom-Auth': 'place-holder-value',
        'X-Version': '1.0.0',
      },
      connectorId: '1',
      secrets: {
        authType: 'api_key_header',
        'X-Custom-Auth': 'i-am-a-custom-auth-string',
      },
    });

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();
    expect(result!.defaults.headers.common).toEqual(
      expect.objectContaining({
        'X-Version': '1.0.0',
        'X-Custom-Auth': 'i-am-a-custom-auth-string',
      })
    );

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(1);

    // @ts-expect-error
    const result2 = result!.interceptors.request.handlers[0].fulfilled({ url: 'http://test3' });
    expect(getCustomAgents).toHaveBeenCalledWith(configurationUtilities, logger, 'http://test3');
  });

  test('returns axios instance configured for oauth client credentials auth when connector token client is undefined', async () => {
    (requestOAuthClientCredentialsToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'Bearer',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({
      connectorId: '1',
      secrets: {
        authType: 'oauth_client_credentials',
        tokenUrl: 'https://test/oauth/token',
        clientId: 'my-client-id',
        clientSecret: 'my-client-secret',
        scope: 'grant',
      },
    });

    expect(requestOAuthClientCredentialsToken as jest.Mock).toHaveBeenCalledWith(
      'https://test/oauth/token',
      logger,
      { clientId: 'my-client-id', clientSecret: 'my-client-secret', scope: 'grant' },
      configurationUtilities
    );

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();
    expect(result!.defaults.headers.common).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer brandnewaccesstoken',
      })
    );

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(1);

    // @ts-expect-error
    expect(result!.interceptors.response.handlers.length).toBe(0);

    // @ts-expect-error
    const result2 = result!.interceptors.request.handlers[0].fulfilled({ url: 'http://test5' });
    expect(getCustomAgents).toHaveBeenCalledWith(configurationUtilities, logger, 'http://test5');
  });

  test('returns axios instance configured for oauth client credentials auth when connector token client is defined and token exists', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'Bearer testtokenvalue',
        createdAt: new Date('2021-01-01T08:00:00.000Z').toISOString(),
        expiresAt: new Date('2021-01-02T13:00:00.000Z').toISOString(),
      },
    });
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({
      connectorId: '1',
      connectorTokenClient,
      secrets: {
        authType: 'oauth_client_credentials',
        tokenUrl: 'https://test/oauth/token',
        clientId: 'my-client-id',
        clientSecret: 'my-client-secret',
        scope: 'grant',
      },
    });

    expect(requestOAuthClientCredentialsToken as jest.Mock).not.toHaveBeenCalled();

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();
    expect(result!.defaults.headers.common).toEqual(
      expect.objectContaining({
        Authorization: 'Bearer testtokenvalue',
      })
    );

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(1);

    // @ts-expect-error
    expect(result!.interceptors.response.handlers.length).toBe(1);

    // @ts-expect-error
    const result2 = result!.interceptors.request.handlers[0].fulfilled({ url: 'http://test5' });
    expect(getCustomAgents).toHaveBeenCalledWith(configurationUtilities, logger, 'http://test5');
  });

  test('returns axios instance configured for pfx certificate auth', async () => {
    const getAxios = getAxiosInstanceWithAuth({
      authTypeRegistry,
      configurationUtilities,
      logger,
    });
    const result = await getAxios({
      connectorId: '1',
      secrets: {
        authType: 'pfx_certificate',
        pfx: Buffer.from("Hi i'm a pfx"),
        passphrase: 'aaaaaaa',
        ca: Buffer.from("Hi i'm a ca"),
      },
    });

    expect(result).not.toBeUndefined();
    expect(result!.defaults.auth).toBeUndefined();

    // @ts-expect-error
    expect(result!.interceptors.request.handlers.length).toBe(1);

    // @ts-expect-error
    const result2 = result!.interceptors.request.handlers[0].fulfilled({ url: 'http://test2' });

    // this interceptor was cleared and the auth type specific one was used
    expect(getCustomAgents).not.toHaveBeenCalled();
  });
});
