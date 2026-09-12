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

  test('throws and logs the error when the token request fails', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 401,
      data: { error: 'invalid_grant' },
    });

    await expect(
      requestOAuthPasswordToken(
        'https://test',
        mockLogger,
        { username: 'my-user', password: 'wrong-password' },
        configurationUtilities
      )
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"{\\"error\\":\\"invalid_grant\\"}"`);

    expect(mockLogger.warn).toHaveBeenCalledWith(
      'error thrown getting the access token from https://test: {"error":"invalid_grant"}'
    );
  });
});
