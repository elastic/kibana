/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import type { Services } from '@kbn/actions-plugin/server/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { validateConfig, validateParams, validateSecrets } from '@kbn/actions-plugin/server/lib';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import type { Logger } from '@kbn/core/server';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';

import * as utils from '@kbn/actions-plugin/server/lib/axios_utils';
import { loggerMock } from '@kbn/logging-mocks';
import { getOAuthClientCredentialsAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token';

import type { WebhookConnectorType, WebhookConnectorTypeExecutorOptions } from './types';

import { getConnectorType } from '.';
import { TaskErrorSource, createTaskRunError } from '@kbn/task-manager-plugin/server';

jest.mock('axios', () => ({
  create: jest.fn(),
  AxiosHeaders: jest.requireActual('axios').AxiosHeaders,
  AxiosError: jest.requireActual('axios').AxiosError,
}));
import axios from 'axios';
import { CRT_FILE, KEY_FILE, PFX_FILE } from '@kbn/connector-schemas/common/auth/mocks';
import { AuthType, SSLCertType, WebhookMethods } from '@kbn/connector-schemas/common/auth';
import type {
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
} from '@kbn/connector-schemas/webhook';
const createAxiosInstanceMock = axios.create as jest.Mock;
const axiosInstanceMock = {
  interceptors: {
    request: { eject: jest.fn(), use: jest.fn() },
    response: { eject: jest.fn(), use: jest.fn() },
  },
};

jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
    patch: jest.fn(),
  };
});

jest.mock('@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token', () => ({
  getOAuthClientCredentialsAccessToken: jest.fn(),
}));

const requestMock = utils.request as jest.Mock;

const services: Services = actionsMock.createServices();
const mockedLogger: jest.Mocked<Logger> = loggerMock.create();

let connectorType: WebhookConnectorType;
let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;
let connectorUsageCollector: ConnectorUsageCollector;

beforeEach(() => {
  configurationUtilities = actionsConfigMock.create();
  connectorType = getConnectorType();
  connectorUsageCollector = new ConnectorUsageCollector({
    logger: mockedLogger,
    connectorId: 'test-connector-id',
  });
  jest.restoreAllMocks();
});

describe('connectorType', () => {
  test('exposes the connector as `webhook` on its Id and Name', () => {
    expect(connectorType.id).toEqual('.webhook');
    expect(connectorType.name).toEqual('Webhook');
  });
});

describe('secrets validation', () => {
  test('succeeds when secrets is valid', () => {
    const secrets: Record<string, string | null> = {
      user: 'bob',
      password: 'supersecret',
      crt: null,
      key: null,
      pfx: null,
      clientSecret: null,
      secretHeaders: null,
    };
    expect(validateSecrets(connectorType, secrets, { configurationUtilities })).toEqual(secrets);
  });

  test('fails when secret user is provided, but password is omitted', () => {
    expect(() => {
      validateSecrets(connectorType, { user: 'bob' }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating connector type secrets: must specify one of the following schemas: user and password; crt and key (with optional password); pfx (with optional password); or clientSecret (for OAuth2)"`
    );
  });

  test('succeeds when authentication credentials are omitted', () => {
    expect(validateSecrets(connectorType, {}, { configurationUtilities })).toEqual({
      crt: null,
      key: null,
      password: null,
      pfx: null,
      user: null,
      clientSecret: null,
      secretHeaders: null,
    });
  });

  test('succeeds when secrets contains a certificate and keyfile', () => {
    const secrets: Record<string, string | null> = {
      password: 'supersecret',
      crt: CRT_FILE,
      key: KEY_FILE,
      pfx: null,
      user: null,
      clientSecret: null,
      secretHeaders: null,
    };
    expect(validateSecrets(connectorType, secrets, { configurationUtilities })).toEqual(secrets);

    const secretsWithoutPassword: Record<string, string | null> = {
      crt: CRT_FILE,
      key: KEY_FILE,
      pfx: null,
      user: null,
      password: null,
      clientSecret: null,
      secretHeaders: null,
    };

    expect(
      validateSecrets(connectorType, secretsWithoutPassword, { configurationUtilities })
    ).toEqual(secretsWithoutPassword);
  });

  test('succeeds when secrets contains a pfx', () => {
    const secrets: Record<string, string | null> = {
      password: 'supersecret',
      pfx: PFX_FILE,
      user: null,
      crt: null,
      key: null,
      clientSecret: null,
      secretHeaders: null,
    };
    expect(validateSecrets(connectorType, secrets, { configurationUtilities })).toEqual(secrets);

    const secretsWithoutPassword: Record<string, string | null> = {
      pfx: PFX_FILE,
      user: null,
      password: null,
      crt: null,
      key: null,
      clientSecret: null,
      secretHeaders: null,
    };

    expect(
      validateSecrets(connectorType, secretsWithoutPassword, { configurationUtilities })
    ).toEqual(secretsWithoutPassword);
  });

  test('fails when secret crt is provided but key omitted, or vice versa', () => {
    expect(() => {
      validateSecrets(connectorType, { crt: CRT_FILE }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating connector type secrets: must specify one of the following schemas: user and password; crt and key (with optional password); pfx (with optional password); or clientSecret (for OAuth2)"`
    );
    expect(() => {
      validateSecrets(connectorType, { key: KEY_FILE }, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating connector type secrets: must specify one of the following schemas: user and password; crt and key (with optional password); pfx (with optional password); or clientSecret (for OAuth2)"`
    );
  });
});

describe('config validation', () => {
  const defaultValues: Record<string, string | null> = {
    headers: null,
    method: 'post',
  };

  test('config validation passes when only required fields are provided', () => {
    const config: Record<string, string | boolean> = {
      url: 'http://mylisteningserver:9200/endpoint',
      authType: AuthType.Basic,
      hasAuth: true,
    };
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation passes when valid methods are provided', () => {
    ['post', 'put'].forEach((method) => {
      const config: Record<string, string | boolean> = {
        url: 'http://mylisteningserver:9200/endpoint',
        method,
        authType: AuthType.Basic,
        hasAuth: true,
      };
      expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
        ...defaultValues,
        ...config,
      });
    });
  });

  test('should validate and throw error when method on config is invalid', () => {
    const config: Record<string, string> = {
      url: 'http://mylisteningserver:9200/endpoint',
      method: 'https',
    };
    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating connector type config: Field \\"method\\": Invalid enum value. Expected 'post' | 'put' | 'patch' | 'get' | 'delete', received 'https'"`
    );
  });

  test('config validation passes when a url is specified', () => {
    const config: Record<string, string | boolean> = {
      url: 'http://mylisteningserver:9200/endpoint',
      authType: AuthType.Basic,
      hasAuth: true,
    };
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation failed when a url is invalid', () => {
    const config: Record<string, string> = {
      url: 'example.com/do-something',
    };
    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating connector type config: error validation webhook action config: unable to parse url: TypeError: Invalid URL: example.com/do-something"`
    );
  });

  test('config validation passes when valid headers are provided', () => {
    // any for testing

    const config: Record<string, any> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('should validate and throw error when headers on config is invalid', () => {
    const config: Record<string, string> = {
      url: 'http://mylisteningserver:9200/endpoint',
      headers: 'application/json',
    };
    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating connector type config: Field \\"headers\\": Expected object, received string"`
    );
  });

  test('config validation passes when kibana config url does not present in allowedHosts', () => {
    // any for testing

    const config: Record<string, any> = {
      url: 'http://mylisteningserver.com:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };

    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual({
      ...defaultValues,
      ...config,
    });
  });

  test('config validation returns an error if the specified URL isnt added to allowedHosts', () => {
    const configUtils = {
      ...actionsConfigMock.create(),
      ensureUriAllowed: (_: string) => {
        throw new Error(`target url is not present in allowedHosts`);
      },
    };

    // any for testing

    const config: Record<string, any> = {
      url: 'http://mylisteningserver.com:9200/endpoint',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities: configUtils });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating connector type config: error validation webhook action config: target url is not present in allowedHosts"`
    );
  });

  test('config validation fails when using disabled pfx certType', () => {
    const config: Record<string, string | boolean> = {
      url: 'https://mylisteningserver:9200/endpoint',
      method: WebhookMethods.POST,
      authType: AuthType.SSL,
      certType: SSLCertType.PFX,
      hasAuth: true,
    };
    configurationUtilities.getWebhookSettings = jest.fn(() => ({
      ssl: { pfx: { enabled: false } },
    }));
    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating connector type config: error validation webhook action config: certType \\"ssl-pfx\\" is disabled"`
    );
  });

  describe('OAuth2 Client Credentials', () => {
    test('throws if required OAuth2 config is missing', async () => {
      const config = {
        method: 'post',
        url: 'https://test.com',
        hasAuth: true,
        authType: AuthType.OAuth2ClientCredentials,
        // missing accessTokenUrl, clientId
      };

      expect(() => {
        validateConfig(connectorType, config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating connector type config: error validation webhook action config: missing Access Token URL (accessTokenUrl), Client ID (clientId) fields"`
      );
    });

    test('throws when additionalFields is no valid JSON', async () => {
      const config = {
        method: 'post',
        url: 'https://test.com',
        hasAuth: true,
        authType: AuthType.OAuth2ClientCredentials,
        accessTokenUrl: 'http://fake.test',
        clientId: 'fake-client-id',
        additionalFields: 'invalid-json',
      };

      expect(() => {
        validateConfig(connectorType, config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating connector type config: error validation webhook action config: additionalFields must be a non-empty JSON object."`
      );
    });

    test('throws when additionalFields is "null"', async () => {
      const config = {
        method: 'post',
        url: 'https://test.com',
        hasAuth: true,
        authType: AuthType.OAuth2ClientCredentials,
        accessTokenUrl: 'http://fake.test',
        clientId: 'fake-client-id',
        additionalFields: 'null',
      };

      expect(() => {
        validateConfig(connectorType, config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating connector type config: error validation webhook action config: additionalFields must be a non-empty JSON object."`
      );
    });

    test('throws when additionalFields is empty', async () => {
      const config = {
        method: 'post',
        url: 'https://test.com',
        hasAuth: true,
        authType: AuthType.OAuth2ClientCredentials,
        accessTokenUrl: 'http://fake.test',
        clientId: 'fake-client-id',
        additionalFields: '{}',
      };

      expect(() => {
        validateConfig(connectorType, config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating connector type config: error validation webhook action config: additionalFields must be a non-empty JSON object."`
      );
    });

    test('throws when additionalFields is an array', async () => {
      const config = {
        method: 'post',
        url: 'https://test.com',
        hasAuth: true,
        authType: AuthType.OAuth2ClientCredentials,
        accessTokenUrl: 'http://fake.test',
        clientId: 'fake-client-id',
        additionalFields: '[]',
      };

      expect(() => {
        validateConfig(connectorType, config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating connector type config: error validation webhook action config: additionalFields must be a non-empty JSON object."`
      );
    });
  });
});

describe('params validation', () => {
  test('param validation passes when no fields are provided as none are required', () => {
    const params: Record<string, string> = {};
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual({});
  });

  test('params validation passes when a valid body is provided', () => {
    const params: Record<string, string> = {
      body: 'count: {{ctx.payload.hits.total}}',
    };
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual({
      ...params,
    });
  });
});

describe('execute()', () => {
  beforeAll(() => {
    requestMock.mockReset();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    requestMock.mockReset();
    requestMock.mockResolvedValue({
      status: 200,
      statusText: '',
      data: '',
      headers: [],
      config: {},
    });
  });

  test('execute with username/password sends request with basic auth', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def/my-webhook',
      method: WebhookMethods.POST,
      headers: {
        aheader: 'a value',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };
    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: {
        user: 'abc',
        password: '123',
        key: null,
        crt: null,
        pfx: null,
        clientSecret: null,
        secretHeaders: null,
      },
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchSnapshot({
      axios: undefined,
      connectorUsageCollector: {
        usage: {
          requestBodyBytes: 0,
        },
      },
      data: 'some data',
      headers: {
        Authorization: 'Basic YWJjOjEyMw==',
        aheader: 'a value',
      },
      logger: expect.any(Object),
      method: 'post',
      sslOverrides: {},
      url: 'https://abc.def/my-webhook',
    });
  });

  test('execute with secret headers and basic auth', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def/my-webhook',
      method: WebhookMethods.POST,
      headers: {
        aheader: 'a value',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };
    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: {
        user: 'abc',
        password: '123',
        key: null,
        crt: null,
        pfx: null,
        secretHeaders: { secretKey: 'secretValue' },
        clientSecret: null,
      },
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchSnapshot({
      axios: undefined,
      connectorUsageCollector: {
        usage: {
          requestBodyBytes: 0,
        },
      },
      data: 'some data',
      headers: {
        Authorization: 'Basic YWJjOjEyMw==',
        aheader: 'a value',
        secretKey: 'secretValue',
      },
      logger: expect.any(Object),
      method: 'post',
      sslOverrides: {},
      url: 'https://abc.def/my-webhook',
    });
  });

  test('execute with secret headers and basic auth when header keys overlap', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def/my-webhook',
      method: WebhookMethods.POST,
      headers: {
        aheader: 'a value',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };
    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: {
        user: 'abc',
        password: '123',
        key: null,
        crt: null,
        pfx: null,
        secretHeaders: { Authorization: 'secretAuthorizationValue' },
        clientSecret: null,
      },
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchSnapshot({
      axios: undefined,
      connectorUsageCollector: {
        usage: {
          requestBodyBytes: 0,
        },
      },
      data: 'some data',
      headers: {
        Authorization: 'secretAuthorizationValue',
        aheader: 'a value',
      },
      logger: expect.any(Object),
      method: 'post',
      sslOverrides: {},
      url: 'https://abc.def/my-webhook',
    });
  });

  test('execute with ssl adds ssl settings to sslOverrides', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def/my-webhook',
      method: WebhookMethods.POST,
      headers: {
        aheader: 'a value',
      },
      authType: AuthType.SSL,
      certType: SSLCertType.CRT,
      hasAuth: true,
    };
    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: {
        crt: CRT_FILE,
        key: KEY_FILE,
        password: 'passss',
        user: null,
        pfx: null,
        clientSecret: null,
        secretHeaders: null,
      },
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;

    expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "axios": undefined,
        "connectorUsageCollector": ConnectorUsageCollector {
          "connectorId": "test-connector-id",
          "logger": Object {
            "context": Array [],
            "debug": [MockFunction] {
              "calls": Array [
                Array [
                  "response from webhook action \\"some-id\\": [HTTP 200] ",
                ],
              ],
              "results": Array [
                Object {
                  "type": "return",
                  "value": undefined,
                },
              ],
            },
            "error": [MockFunction],
            "fatal": [MockFunction],
            "get": [MockFunction],
            "info": [MockFunction],
            "isLevelEnabled": [MockFunction],
            "log": [MockFunction],
            "trace": [MockFunction],
            "warn": [MockFunction],
          },
          "usage": Object {
            "requestBodyBytes": 0,
          },
        },
        "data": "some data",
        "headers": Object {
          "aheader": "a value",
        },
        "logger": Object {
          "context": Array [],
          "debug": [MockFunction] {
            "calls": Array [
              Array [
                "response from webhook action \\"some-id\\": [HTTP 200] ",
              ],
            ],
            "results": Array [
              Object {
                "type": "return",
                "value": undefined,
              },
            ],
          },
          "error": [MockFunction],
          "fatal": [MockFunction],
          "get": [MockFunction],
          "info": [MockFunction],
          "isLevelEnabled": [MockFunction],
          "log": [MockFunction],
          "trace": [MockFunction],
          "warn": [MockFunction],
        },
        "method": "post",
        "sslOverrides": Object {
          "cert": Object {
            "data": Array [
              10,
              45,
              45,
              45,
              45,
              45,
              66,
              69,
              71,
              73,
              78,
              32,
              67,
              69,
              82,
              84,
              73,
              70,
              73,
              67,
              65,
              84,
              69,
              45,
              45,
              45,
              45,
              45,
              10,
              45,
              45,
              45,
              45,
              45,
              69,
              78,
              68,
              32,
              67,
              69,
              82,
              84,
              73,
              70,
              73,
              67,
              65,
              84,
              69,
              45,
              45,
              45,
              45,
              45,
              10,
            ],
            "type": "Buffer",
          },
          "key": Object {
            "data": Array [
              10,
              45,
              45,
              45,
              45,
              45,
              66,
              69,
              71,
              73,
              78,
              32,
              80,
              82,
              73,
              86,
              65,
              84,
              69,
              32,
              75,
              69,
              89,
              45,
              45,
              45,
              45,
              45,
              10,
              45,
              45,
              45,
              45,
              45,
              69,
              78,
              68,
              32,
              80,
              82,
              73,
              86,
              65,
              84,
              69,
              32,
              75,
              69,
              89,
              45,
              45,
              45,
              45,
              45,
              10,
            ],
            "type": "Buffer",
          },
          "passphrase": "passss",
        },
        "url": "https://abc.def/my-webhook",
      }
    `);
  });

  test('execute with exception maxContentLength size exceeded should log the proper error', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def/my-webhook',
      method: WebhookMethods.POST,
      headers: {
        aheader: 'a value',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };
    requestMock.mockReset();
    requestMock.mockRejectedValueOnce({
      tag: 'err',
      isAxiosError: true,
      message: 'maxContentLength size of 1000000 exceeded',
    });
    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: {
        user: 'abc',
        password: '123',
        key: null,
        crt: null,
        pfx: null,
        clientSecret: null,
        secretHeaders: null,
      },
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });
    expect(mockedLogger.error).toBeCalledWith(
      'error on some-id webhook event: maxContentLength size of 1000000 exceeded'
    );
  });

  test('execute without username/password sends request without basic auth', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def/my-webhook',
      method: WebhookMethods.POST,
      headers: {
        aheader: 'a value',
      },
      hasAuth: false,
    };
    const secrets: ConnectorTypeSecretsType = {
      user: null,
      password: null,
      pfx: null,
      crt: null,
      key: null,
      clientSecret: null,
      secretHeaders: null,
    };
    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets,
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      Object {
        "axios": undefined,
        "connectorUsageCollector": ConnectorUsageCollector {
          "connectorId": "test-connector-id",
          "logger": Object {
            "context": Array [],
            "debug": [MockFunction] {
              "calls": Array [
                Array [
                  "response from webhook action \\"some-id\\": [HTTP 200] ",
                ],
              ],
              "results": Array [
                Object {
                  "type": "return",
                  "value": undefined,
                },
              ],
            },
            "error": [MockFunction],
            "fatal": [MockFunction],
            "get": [MockFunction],
            "info": [MockFunction],
            "isLevelEnabled": [MockFunction],
            "log": [MockFunction],
            "trace": [MockFunction],
            "warn": [MockFunction],
          },
          "usage": Object {
            "requestBodyBytes": 0,
          },
        },
        "data": "some data",
        "headers": Object {
          "aheader": "a value",
        },
        "logger": Object {
          "context": Array [],
          "debug": [MockFunction] {
            "calls": Array [
              Array [
                "response from webhook action \\"some-id\\": [HTTP 200] ",
              ],
            ],
            "results": Array [
              Object {
                "type": "return",
                "value": undefined,
              },
            ],
          },
          "error": [MockFunction],
          "fatal": [MockFunction],
          "get": [MockFunction],
          "info": [MockFunction],
          "isLevelEnabled": [MockFunction],
          "log": [MockFunction],
          "trace": [MockFunction],
          "warn": [MockFunction],
        },
        "method": "post",
        "sslOverrides": Object {},
        "url": "https://abc.def/my-webhook",
      }
    `);
  });

  test('renders parameter templates as expected', async () => {
    const rogue = `double-quote:"; line-break->\n`;

    expect(connectorType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      body: '{"x": "{{rogue}}"}',
    };
    const variables = {
      rogue,
    };
    const params = connectorType.renderParameterTemplates!(
      mockedLogger,
      paramsWithTemplates,
      variables
    );

    let paramsObject: any;
    try {
      paramsObject = JSON.parse(`${params.body}`);
    } catch (err) {
      expect(err).toBe(null); // kinda weird, but test should fail if it can't parse
    }

    expect(paramsObject.x).toBe(rogue);
    expect(params.body).toBe(`{"x": "double-quote:\\"; line-break->\\n"}`);
  });

  test('body is undefined when executing GET operation', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def/my-webhook',
      method: WebhookMethods.GET,
      headers: {
        aheader: 'a value',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };

    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: {
        user: 'abc',
        password: '123',
        key: null,
        crt: null,
        pfx: null,
        clientSecret: null,
        secretHeaders: null,
      },
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(requestMock.mock.calls[0][0].method).toBe(WebhookMethods.GET);
    expect(requestMock.mock.calls[0][0].data).toBeUndefined();
  });

  test('body is undefined when executing DELETE operation', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def/my-webhook',
      method: WebhookMethods.DELETE,
      headers: {
        aheader: 'a value',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };

    await connectorType.executor({
      actionId: 'some-id',
      services,
      config,
      secrets: {
        user: 'abc',
        password: '123',
        key: null,
        crt: null,
        pfx: null,
        clientSecret: null,
        secretHeaders: null,
      },
      params: { body: 'some data' },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(requestMock.mock.calls[0][0].method).toBe(WebhookMethods.DELETE);
    expect(requestMock.mock.calls[0][0].data).toBeUndefined();
  });

  describe('error handling', () => {
    test.each([400, 404, 405, 406, 410, 411, 414, 428, 431])(
      'forwards user error source in result for %s error responses',
      async (status) => {
        const config: ConnectorTypeConfigType = {
          url: 'https://abc.def/my-webhook',
          method: WebhookMethods.POST,
          headers: {
            aheader: 'a value',
          },
          authType: AuthType.Basic,
          hasAuth: true,
        };

        requestMock.mockRejectedValueOnce(
          createTaskRunError(
            {
              tag: 'err',
              isAxiosError: true,
              response: {
                status,
                statusText: 'Not Found',
                data: {
                  message:
                    'The requested webhook "b946082a-a623-4353-bd99-ed35e5fa4fce" is not registered.',
                },
              },
            } as unknown as Error,
            TaskErrorSource.USER
          )
        );
        const result = await connectorType.executor({
          actionId: 'some-id',
          services,
          config,
          secrets: {
            user: 'abc',
            password: '123',
            key: null,
            crt: null,
            pfx: null,
            clientSecret: null,
            secretHeaders: null,
          },
          params: { body: 'some data' },
          configurationUtilities,
          logger: mockedLogger,
          connectorUsageCollector,
        });

        expect(result.errorSource).toBe('user');
      }
    );

    it('should log an error if refreshing access token fails', async () => {
      const errorMessage = 'Invalid client or Invalid client credentials';
      (getOAuthClientCredentialsAccessToken as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage)
      );
      createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);

      const execOptions: WebhookConnectorTypeExecutorOptions = {
        actionId: 'test-id',
        config: {
          method: WebhookMethods.POST,
          url: 'https://test.com',
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://token.url',
          clientId: 'client',
          headers: { 'X-Custom': 'value' },
        },
        params: { body: '{}' },
        secrets: {
          clientSecret: 'secret',
          key: null,
          user: null,
          password: null,
          crt: null,
          pfx: null,
          secretHeaders: null,
        },
        configurationUtilities,
        logger: mockedLogger,
        services,
        connectorUsageCollector,
      };

      await connectorType.executor(execOptions);

      expect(mockedLogger.error.mock.calls[0][0]).toMatchInlineSnapshot(
        `"ConnectorId \\"test-id\\": error \\"Unable to retrieve/refresh the access token: Invalid client or Invalid client credentials\\""`
      );
    });
  });

  describe('oauth2 client credentials', () => {
    it('throws if refresh token fails', async () => {
      (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValue(undefined);

      const execOptions: WebhookConnectorTypeExecutorOptions = {
        actionId: 'test-id',
        config: {
          method: WebhookMethods.POST,
          url: 'https://test.com',
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://token.url',
          clientId: 'client',
          headers: null,
        },
        params: { body: '{}' },
        secrets: {
          clientSecret: 'secret',
          key: null,
          user: null,
          password: null,
          crt: null,
          pfx: null,
          secretHeaders: null,
        },
        configurationUtilities,
        logger: mockedLogger,
        services,
        connectorUsageCollector,
      };

      try {
        await connectorType.executor(execOptions);
      } catch (error) {
        expect(error).toMatchInlineSnapshot(
          `[Error: Unable to retrieve new access token for connectorId: test-id]`
        );
      }
    });

    it('adds access token to headers', async () => {
      const accessToken = 'Bearer my-access-token';
      (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValueOnce(accessToken);
      createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);

      const execOptions: WebhookConnectorTypeExecutorOptions = {
        actionId: 'test-id',
        config: {
          method: WebhookMethods.POST,
          url: 'https://test.com',
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://token.url',
          clientId: 'client',
          headers: null,
        },
        params: { body: '{}' },
        secrets: {
          clientSecret: 'secret',
          key: null,
          user: null,
          password: null,
          crt: null,
          pfx: null,
          secretHeaders: null,
        },
        configurationUtilities,
        logger: mockedLogger,
        services,
        connectorUsageCollector,
      };

      await connectorType.executor(execOptions);

      expect((utils.request as jest.Mock).mock.calls[0][0].headers.Authorization).toBe(accessToken);
    });

    it('merges custom headers with Authorization header', async () => {
      const accessToken = 'Bearer token123';
      (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValueOnce(accessToken);
      createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);

      const execOptions: WebhookConnectorTypeExecutorOptions = {
        actionId: 'test-id',
        config: {
          method: WebhookMethods.POST,
          url: 'https://test.com',
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://token.url',
          clientId: 'client',
          headers: { 'X-Custom': 'value' },
        },
        params: { body: '{}' },
        secrets: {
          clientSecret: 'secret',
          key: null,
          user: null,
          password: null,
          crt: null,
          pfx: null,
          secretHeaders: null,
        },
        configurationUtilities,
        logger: mockedLogger,
        services,
        connectorUsageCollector,
      };

      await connectorType.executor(execOptions);

      const headers = (utils.request as jest.Mock).mock.calls[0][0].headers;
      expect(headers.Authorization).toBe(accessToken);
      expect(headers['X-Custom']).toBe('value');
    });
  });
});
