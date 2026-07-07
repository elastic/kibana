/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('axios', () => ({
  create: jest.fn(),
}));
import axios from 'axios';
import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { requestOAuthToken } from './request_oauth_token';
import { actionsConfigMock } from '../actions_config.mock';

const createAxiosInstanceMock = axios.create as jest.Mock;
const axiosInstanceMock = jest.fn();

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

interface TestOAuthRequestParams {
  someAdditionalParam?: string;
  clientId?: string;
  clientSecret?: string;
}

describe('requestOAuthToken', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);
  });

  test('making a token request with the required options', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        token_type: 'Bearer',
        access_token: 'dfjsdfgdjhfgsjdf',
        expires_in: 123,
      },
    });

    await requestOAuthToken<TestOAuthRequestParams>(
      'https://test',
      'test',
      configurationUtilities,
      mockLogger,
      {
        client_id: '123456',
        client_secret: 'secrert123',
        some_additional_param: 'test',
      }
    );

    expect(axiosInstanceMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://test",
        Object {
          "beforeRedirect": [Function],
          "data": "client_id=123456&client_secret=secrert123&grant_type=test&some_additional_param=test",
          "headers": Object {
            "Accept": "application/json",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
          },
          "httpAgent": undefined,
          "httpsAgent": Agent {
            "_events": Object {
              "free": [Function],
              "newListener": [Function],
            },
            "_eventsCount": 2,
            "_maxListeners": undefined,
            "_sessionCache": Object {
              "list": Array [],
              "map": Object {},
            },
            "agentKeepAliveTimeoutBuffer": 1000,
            "defaultPort": 443,
            "freeSockets": Object {},
            "keepAlive": false,
            "keepAliveMsecs": 1000,
            "maxCachedSessions": 100,
            "maxFreeSockets": 256,
            "maxSockets": Infinity,
            "maxTotalSockets": Infinity,
            "options": Object {
              "defaultPort": 443,
              "noDelay": true,
              "path": null,
              "protocol": "https:",
              "rejectUnauthorized": true,
            },
            "protocol": "https:",
            "requests": Object {},
            "scheduling": "lifo",
            "sockets": Object {},
            "totalSocketCount": 0,
            Symbol(shapeMode): false,
            Symbol(kCapture): false,
          },
          "maxContentLength": 1000000,
          "method": "post",
          "proxy": false,
          "timeout": 360000,
          "validateStatus": [Function],
        },
      ]
    `);
  });

  test('throw the exception and log the proper error if token was not get successfuly', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 400,
      data: {
        error: 'invalid_scope',
        error_description:
          "AADSTS70011: The provided value for the input parameter 'scope' is not valid.",
      },
    });

    await expect(
      requestOAuthToken<TestOAuthRequestParams>(
        'https://test',
        'test',
        configurationUtilities,
        mockLogger,
        {
          client_id: '123456',
          client_secret: 'secrert123',
          some_additional_param: 'test',
        }
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(
      '"{\\"error\\":\\"invalid_scope\\",\\"error_description\\":\\"AADSTS70011: The provided value for the input parameter \'scope\' is not valid.\\"}"'
    );

    expect(mockLogger.warn.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "error thrown getting the access token from https://test: {\\"error\\":\\"invalid_scope\\",\\"error_description\\":\\"AADSTS70011: The provided value for the input parameter 'scope' is not valid.\\"}",
      ]
    `);
  });

  test('sends Basic Auth header and removes credentials from body when useBasicAuth is true', async () => {
    const configurationUtilities = actionsConfigMock.create();
    const clientId = 'my-client';
    const clientSecret = 'my-secret';
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        token_type: 'Bearer',
        access_token: 'token123',
        expires_in: 3600,
      },
    });

    await requestOAuthToken<TestOAuthRequestParams>(
      'https://test',
      'authorization_code',
      configurationUtilities,
      mockLogger,
      {
        client_id: clientId,
        client_secret: clientSecret,
        some_additional_param: 'value',
      },
      true
    );

    const requestConfig = axiosInstanceMock.mock.calls[0][1];

    // Body should not contain client_id or client_secret
    expect(requestConfig.data).not.toContain('client_id');
    expect(requestConfig.data).not.toContain('client_secret');
    expect(requestConfig.data).toContain('grant_type=authorization_code');
    expect(requestConfig.data).toContain('some_additional_param=value');

    // Should have Basic Auth header
    const encoded = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const expectedHeader = `Basic ${encoded}`;
    expect(requestConfig.headers).toEqual(
      expect.objectContaining({
        Authorization: expectedHeader,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        Accept: 'application/json',
      })
    );
  });

  test('includes credentials in body and no Basic Auth header when useBasicAuth is false', async () => {
    const configurationUtilities = actionsConfigMock.create();
    const clientId = 'my-client';
    const clientSecret = 'my-secret';
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        token_type: 'Bearer',
        access_token: 'token123',
        expires_in: 3600,
      },
    });

    await requestOAuthToken<TestOAuthRequestParams>(
      'https://test',
      'authorization_code',
      configurationUtilities,
      mockLogger,
      {
        client_id: clientId,
        client_secret: clientSecret,
        some_additional_param: 'value',
      },
      false
    );

    const requestConfig = axiosInstanceMock.mock.calls[0][1];

    // Body should contain client_id and client_secret
    expect(requestConfig.data).toContain(`client_id=${clientId}`);
    expect(requestConfig.data).toContain(`client_secret=${clientSecret}`);
    expect(requestConfig.data).toContain('grant_type=authorization_code');

    // Should NOT have Basic Auth header
    expect(requestConfig.headers).not.toHaveProperty('Authorization');
  });

  test('returns parsed token response on success', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        token_type: 'Bearer',
        access_token: 'access-token-123',
        expires_in: 3600,
        refresh_token: 'refresh-token-456',
        refresh_token_expires_in: 86400,
      },
    });

    const result = await requestOAuthToken<TestOAuthRequestParams>(
      'https://test',
      'authorization_code',
      configurationUtilities,
      mockLogger,
      {
        client_id: 'my-client',
        client_secret: 'my-secret',
      }
    );

    expect(result).toEqual({
      tokenType: 'Bearer',
      accessToken: 'access-token-123',
      expiresIn: 3600,
      refreshToken: 'refresh-token-456',
      refreshTokenExpiresIn: 86400,
    });
  });

  test('throws when the token endpoint returns a non-JSON (string) response body', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: 'access_token=gho_abc123&token_type=bearer&scope=repo',
    });

    await expect(
      requestOAuthToken<TestOAuthRequestParams>(
        'https://test',
        'authorization_code',
        configurationUtilities,
        mockLogger,
        { client_id: 'id', client_secret: 'secret' }
      )
    ).rejects.toThrow('non-JSON response body');

    expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('non-JSON response'));
  });

  test('throws when access_token is missing from the response', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: { token_type: 'Bearer' },
    });

    await expect(
      requestOAuthToken<TestOAuthRequestParams>(
        'https://test',
        'authorization_code',
        configurationUtilities,
        mockLogger,
        { client_id: 'id', client_secret: 'secret' }
      )
    ).rejects.toThrow('missing required field (access_token)');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('missing access_token (path: access_token)')
    );
  });

  test('throws when token_type is missing from the response', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: { access_token: 'abc123' },
    });

    await expect(
      requestOAuthToken<TestOAuthRequestParams>(
        'https://test',
        'authorization_code',
        configurationUtilities,
        mockLogger,
        { client_id: 'id', client_secret: 'secret' }
      )
    ).rejects.toThrow('missing required field (token_type)');

    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.stringContaining('missing token_type (path: token_type)')
    );
  });

  test('extracts tokens from nested paths when tokenResponseOptions are provided', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        ok: true,
        authed_user: {
          access_token: 'xoxp-slack-user-token',
          token_type: 'bearer',
          expires_in: 7200,
          refresh_token: 'nested-refresh',
        },
        access_token: 'xoxb-bot-token',
        token_type: 'bot',
        expires_in: 3600,
      },
    });

    const result = await requestOAuthToken<TestOAuthRequestParams>(
      'https://slack.com/api/oauth.v2.access',
      'authorization_code',
      configurationUtilities,
      mockLogger,
      { client_id: 'slack-client', client_secret: 'slack-secret' },
      false,
      {
        accessTokenPath: 'authed_user.access_token',
        tokenTypePath: 'authed_user.token_type',
      }
    );

    expect(result).toEqual({
      tokenType: 'bearer',
      accessToken: 'xoxp-slack-user-token',
      expiresIn: 7200,
      refreshToken: 'nested-refresh',
      refreshTokenExpiresIn: undefined,
    });
  });

  test('falls back to default paths when tokenResponseOptions are not provided', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        token_type: 'Bearer',
        access_token: 'standard-token',
        expires_in: 3600,
      },
    });

    const result = await requestOAuthToken<TestOAuthRequestParams>(
      'https://test',
      'authorization_code',
      configurationUtilities,
      mockLogger,
      { client_id: 'id', client_secret: 'secret' },
      false,
      undefined
    );

    expect(result).toEqual({
      tokenType: 'Bearer',
      accessToken: 'standard-token',
      expiresIn: 3600,
      refreshToken: undefined,
      refreshTokenExpiresIn: undefined,
    });
  });

  test('siblingOrRoot falls back to top-level when nested sibling fields are absent', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        ok: true,
        authed_user: {
          access_token: 'xoxp-user-token',
          token_type: 'bearer',
        },
        expires_in: 43200,
        refresh_token: 'top-level-refresh',
        refresh_token_expires_in: 604800,
      },
    });

    const result = await requestOAuthToken<TestOAuthRequestParams>(
      'https://slack.com/api/oauth.v2.access',
      'authorization_code',
      configurationUtilities,
      mockLogger,
      { client_id: 'slack-client', client_secret: 'slack-secret' },
      false,
      { accessTokenPath: 'authed_user.access_token', tokenTypePath: 'authed_user.token_type' }
    );

    expect(result).toEqual({
      tokenType: 'bearer',
      accessToken: 'xoxp-user-token',
      expiresIn: 43200,
      refreshToken: 'top-level-refresh',
      refreshTokenExpiresIn: 604800,
    });
  });

  test('siblingOrRoot prefers nested sibling over top-level when both exist', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        authed_user: {
          access_token: 'nested-token',
          token_type: 'bearer',
          expires_in: 100,
          refresh_token: 'nested-refresh',
        },
        expires_in: 999,
        refresh_token: 'top-refresh',
      },
    });

    const result = await requestOAuthToken<TestOAuthRequestParams>(
      'https://test',
      'authorization_code',
      configurationUtilities,
      mockLogger,
      { client_id: 'id', client_secret: 'secret' },
      false,
      { accessTokenPath: 'authed_user.access_token', tokenTypePath: 'authed_user.token_type' }
    );

    expect(result).toEqual({
      tokenType: 'bearer',
      accessToken: 'nested-token',
      expiresIn: 100,
      refreshToken: 'nested-refresh',
      refreshTokenExpiresIn: undefined,
    });
  });

  test('siblingOrRoot reads from top-level when accessTokenPath is not nested', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        access_token: 'flat-token',
        token_type: 'Bearer',
        expires_in: 3600,
        refresh_token: 'flat-refresh',
        refresh_expires_in: 86400,
      },
    });

    const result = await requestOAuthToken<TestOAuthRequestParams>(
      'https://test',
      'authorization_code',
      configurationUtilities,
      mockLogger,
      { client_id: 'id', client_secret: 'secret' },
      false,
      { accessTokenPath: 'access_token' }
    );

    expect(result).toEqual({
      tokenType: 'Bearer',
      accessToken: 'flat-token',
      expiresIn: 3600,
      refreshToken: 'flat-refresh',
      refreshTokenExpiresIn: 86400,
    });
  });

  test('siblingOrRoot resolves refresh_expires_in falling back to refresh_token_expires_in', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        access_token: 'token',
        token_type: 'Bearer',
        refresh_token: 'refresh',
        refresh_token_expires_in: 604800,
      },
    });

    const result = await requestOAuthToken<TestOAuthRequestParams>(
      'https://test',
      'authorization_code',
      configurationUtilities,
      mockLogger,
      { client_id: 'id', client_secret: 'secret' }
    );

    expect(result.refreshTokenExpiresIn).toBe(604800);
  });

  test('uses tokenType literal override instead of extracting from response', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        ok: true,
        authed_user: {
          access_token: 'xoxp-slack-user-token',
          token_type: 'user',
        },
        access_token: 'xoxb-bot-token',
        token_type: 'bot',
      },
    });

    const result = await requestOAuthToken<TestOAuthRequestParams>(
      'https://slack.com/api/oauth.v2.access',
      'authorization_code',
      configurationUtilities,
      mockLogger,
      { client_id: 'slack-client', client_secret: 'slack-secret' },
      false,
      {
        accessTokenPath: 'authed_user.access_token',
        tokenType: 'bearer',
      }
    );

    expect(result).toEqual({
      tokenType: 'bearer',
      accessToken: 'xoxp-slack-user-token',
      expiresIn: undefined,
      refreshToken: undefined,
      refreshTokenExpiresIn: undefined,
    });
  });
});
