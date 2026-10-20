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
import { actionsConfigMock } from '../actions_config.mock';
import { requestOAuthPasswordToken } from './request_oauth_password_token';

const createAxiosInstanceMock = axios.create as jest.Mock;
const axiosInstanceMock = jest.fn();

const mockLogger = loggingSystemMock.create().get() as jest.Mocked<Logger>;

const paramsToObject = (params: URLSearchParams): Record<string, string> => {
  const obj: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    obj[key] = value;
  }
  return obj;
};

describe('requestOAuthPasswordToken', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);
  });

  test('makes a token request with the username and password in the body', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        token_type: 'Bearer',
        access_token: 'dfjsdfgdjhfgsjdf',
        expires_in: 123,
      },
    });

    await requestOAuthPasswordToken(
      'https://test',
      mockLogger,
      { username: 'my-user', password: 'my-password' },
      configurationUtilities
    );

    const receivedDataString = axiosInstanceMock.mock.calls[0][1].data;
    const receivedParams = new URLSearchParams(receivedDataString);
    expect(paramsToObject(receivedParams)).toEqual({
      username: 'my-user',
      password: 'my-password',
      grant_type: 'password',
    });
  });

  test('supports an email field, client ID, scope, and JSON body', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockResolvedValueOnce({
      status: 200,
      data: { token_type: 'Bearer', access_token: 'token', expires_in: 1000 },
    });
    await requestOAuthPasswordToken(
      'https://test/api/token',
      mockLogger,
      {
        username: 'user@example.com',
        password: 'user-password',
        clientId: 'api-password',
        scope: 'read',
        usernameField: 'email',
        requestBodyFormat: 'json',
      },
      configurationUtilities
    );

    expect(configurationUtilities.ensureUriAllowed).toHaveBeenCalledWith('https://test/api/token');
    expect(axiosInstanceMock).toHaveBeenCalledWith(
      'https://test/api/token',
      expect.objectContaining({
        data: JSON.stringify({
          email: 'user@example.com',
          password: 'user-password',
          client_id: 'api-password',
          scope: 'read',
          grant_type: 'password',
        }),
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        maxRedirects: 0,
      })
    );
  });

  test.each([undefined, 'Bearer'])(
    'uses token type override %s only when requested',
    async (tokenType) => {
      axiosInstanceMock.mockResolvedValueOnce({
        status: 200,
        data: { token_type: 'bearer', access_token: 'token' },
      });
      const result = await requestOAuthPasswordToken(
        'https://test/api/token',
        mockLogger,
        { username: 'user', password: 'password', tokenType },
        actionsConfigMock.create()
      );
      expect(result.tokenType).toBe(tokenType ?? 'bearer');
      expect(new URLSearchParams(axiosInstanceMock.mock.calls[0][1].data).has('tokenType')).toBe(
        false
      );
    }
  );

  test('checks the allowed host before sending credentials', async () => {
    const configurationUtilities = actionsConfigMock.create();
    configurationUtilities.ensureUriAllowed.mockImplementation(() => {
      throw new Error('Host is not allowed');
    });
    await expect(
      requestOAuthPasswordToken(
        'https://blocked.example/api/token',
        mockLogger,
        {
          username: 'user',
          password: 'password',
        },
        configurationUtilities
      )
    ).rejects.toThrow('Host is not allowed');
    expect(axiosInstanceMock).not.toHaveBeenCalled();
  });

  test('does not expose the token error response', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 401,
      data: { error: 'invalid_grant', password: 'wrong-password', client_id: 'api-password' },
    });

    await expect(
      requestOAuthPasswordToken(
        'https://test',
        mockLogger,
        { username: 'my-user', password: 'wrong-password' },
        configurationUtilities
      )
    ).rejects.toThrow('OAuth password token request failed (HTTP 401).');

    expect(mockLogger.warn).toHaveBeenCalledWith('OAuth password token request failed (HTTP 401).');
  });
});
