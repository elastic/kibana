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
import { URLSearchParams } from 'url';
import { actionsConfigMock } from '../actions_config.mock';
import { requestOAuthClientCredentialsToken } from './request_oauth_client_credentials_token';

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

describe('requestOAuthClientCredentialsToken', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);
  });

  test('making a token request with required options only', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        tokenType: 'Bearer',
        accessToken: 'dfjsdfgdjhfgsjdf',
        expiresIn: 123,
      },
    });
    await requestOAuthClientCredentialsToken(
      'https://test',
      mockLogger,
      {
        scope: 'test',
        clientId: '123456',
        clientSecret: 'secrert123',
      },
      configurationUtilities
    );

    const receivedDataString = axiosInstanceMock.mock.calls[0][1].data;
    const receivedParams = new URLSearchParams(receivedDataString);
    expect(paramsToObject(receivedParams)).toEqual({
      client_id: '123456',
      client_secret: 'secrert123',
      grant_type: 'client_credentials',
      scope: 'test',
    });

    expect(axiosInstanceMock.mock.calls[0]).toMatchInlineSnapshot(`
      Array [
        "https://test",
        Object {
          "beforeRedirect": [Function],
          "data": "client_id=123456&client_secret=secrert123&grant_type=client_credentials&scope=test",
          "headers": Object {
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

  test('making a token request with additional fields', async () => {
    const configurationUtilities = actionsConfigMock.create();
    axiosInstanceMock.mockReturnValueOnce({
      status: 200,
      data: {
        tokenType: 'Bearer',
        accessToken: 'tokenwithfields',
        expiresIn: 456,
      },
    });

    const additionalFields = {
      custom_param: 'value1',
      another_field: 'value 2 with spaces',
      numeric_field: 123,
    };

    await requestOAuthClientCredentialsToken(
      'https://test-additional',
      mockLogger,
      {
        scope: 'test-scope',
        clientId: 'client-abc',
        clientSecret: 'secret-xyz',
        ...additionalFields,
      },
      configurationUtilities
    );

    const receivedDataString = axiosInstanceMock.mock.calls[0][1].data;
    const receivedParams = new URLSearchParams(receivedDataString);

    const expectedParamsObject = {
      another_field: 'value 2 with spaces',
      client_id: 'client-abc',
      client_secret: 'secret-xyz',
      custom_param: 'value1',
      grant_type: 'client_credentials',
      numeric_field: '123',
      scope: 'test-scope',
    };

    expect(paramsToObject(receivedParams)).toEqual(expectedParamsObject);

    expect(axiosInstanceMock.mock.calls[0][1].data).toMatchInlineSnapshot(
      `"another_field=value%202%20with%20spaces&client_id=client-abc&client_secret=secret-xyz&custom_param=value1&grant_type=client_credentials&numeric_field=123&scope=test-scope"`
    );
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
      requestOAuthClientCredentialsToken(
        'https://test',
        mockLogger,
        {
          scope: 'test',
          clientId: '123456',
          clientSecret: 'secrert123',
        },
        configurationUtilities
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
});
