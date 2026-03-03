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

import type { HttpConnectorType, HttpConnectorTypeExecutorOptions } from './types';

import { getConnectorType, getSystemConnectorType } from '.';
import { TaskErrorSource, createTaskRunError } from '@kbn/task-manager-plugin/server';

jest.mock('axios', () => ({
  create: jest.fn(),
  AxiosHeaders: jest.requireActual('axios').AxiosHeaders,
  AxiosError: jest.requireActual('axios').AxiosError,
}));
import axios from 'axios';
import { CRT_FILE, KEY_FILE, PFX_FILE } from '@kbn/connector-schemas/common/auth/mocks';
import { AuthType, SSLCertType } from '@kbn/connector-schemas/common/auth';
import type {
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
} from '@kbn/connector-schemas/http';
import { CONNECTOR_ID, CONNECTOR_ID_SYSTEM } from '@kbn/connector-schemas/http';
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

let connectorType: HttpConnectorType;
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
  test('exposes the connector as `.http` on its Id and Name', () => {
    expect(connectorType.id).toEqual(CONNECTOR_ID);
    expect(connectorType.name).toEqual('HTTP');
  });

  test('system connector type exposes the connector as `.http-system` on its Id', () => {
    const systemConnectorType = getSystemConnectorType();
    expect(systemConnectorType.id).toEqual(CONNECTOR_ID_SYSTEM);
    expect(systemConnectorType.isSystemActionType).toBe(true);
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
  test('config validation passes when only required fields are provided', () => {
    const config: Record<string, string | boolean | null> = {
      url: 'http://mylisteningserver:9200/endpoint',
      authType: AuthType.Basic,
      hasAuth: true,
      headers: null,
    };
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual(config);
  });

  test('config validation passes when a url is specified', () => {
    const config: Record<string, string | boolean | null> = {
      url: 'http://mylisteningserver:9200/endpoint',
      authType: AuthType.Basic,
      hasAuth: true,
      headers: null,
    };
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual(config);
  });

  test('config validation failed when a url is invalid', () => {
    const config: Record<string, string> = {
      url: 'example.com/do-something',
    };
    expect(() => {
      validateConfig(connectorType, config, { configurationUtilities });
    }).toThrowErrorMatchingInlineSnapshot(
      `"error validating connector type config: Field \\"url\\": Invalid url"`
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
    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual(config);
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

    expect(validateConfig(connectorType, config, { configurationUtilities })).toEqual(config);
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
      `"error validating connector type config: error validation http action config: target url is not present in allowedHosts"`
    );
  });

  test('config validation fails when using disabled pfx certType', () => {
    const config: Record<string, string | boolean> = {
      url: 'https://mylisteningserver:9200/endpoint',
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
      `"error validating connector type config: error validation http action config: certType \\"ssl-pfx\\" is disabled"`
    );
  });

  describe('OAuth2 Client Credentials', () => {
    test('throws if required OAuth2 config is missing', async () => {
      const config = {
        url: 'https://test.com',
        hasAuth: true,
        authType: AuthType.OAuth2ClientCredentials,
        // missing accessTokenUrl, clientId
      };

      expect(() => {
        validateConfig(connectorType, config, { configurationUtilities });
      }).toThrowErrorMatchingInlineSnapshot(
        `"error validating connector type config: error validation http action config: missing Access Token URL (accessTokenUrl), Client ID (clientId) fields"`
      );
    });

    test('throws when additionalFields is no valid JSON', async () => {
      const config = {
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
        `"error validating connector type config: error validation http action config: additionalFields must be a valid JSON object"`
      );
    });

    test('throws when additionalFields is "null"', async () => {
      const config = {
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
        `"error validating connector type config: error validation http action config: additionalFields must be a valid JSON object"`
      );
    });

    test('throws when additionalFields is empty', async () => {
      const config = {
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
        `"error validating connector type config: error validation http action config: additionalFields must be a valid JSON object"`
      );
    });

    test('throws when additionalFields is an array', async () => {
      const config = {
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
        `"error validating connector type config: error validation http action config: additionalFields must be a valid JSON object"`
      );
    });
  });
});

describe('params validation', () => {
  test('param validation passes when no fields are provided as none are required', () => {
    const params: Record<string, string> = {};
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual({
      method: 'GET',
    });
  });

  test('params validation passes when a valid body is provided', () => {
    const params: Record<string, string> = {
      body: 'count: {{ctx.payload.hits.total}}',
    };
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual({
      method: 'GET',
      ...params,
    });
  });

  test('params validation passes when valid method is provided', () => {
    const params: Record<string, string> = {
      method: 'POST',
      body: 'some data',
    };
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual(params);
  });

  test('params validation passes when path is provided', () => {
    const params: Record<string, string> = {
      path: '/api/v1/endpoint',
    };
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual({
      method: 'GET',
      ...params,
    });
  });

  test('params validation passes when query is provided', () => {
    const params: Record<string, any> = {
      query: {
        key1: 'value1',
        key2: 'value2',
      },
    };
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual({
      method: 'GET',
      ...params,
    });
  });

  test('params validation passes when headers are provided', () => {
    const params: Record<string, any> = {
      headers: {
        'X-Custom': 'value',
      },
    };
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual({
      method: 'GET',
      ...params,
    });
  });

  test('params validation passes when fetcher options are provided', () => {
    const params: Record<string, any> = {
      fetcher: {
        skip_ssl_verification: true,
        follow_redirects: false,
        max_redirects: 5,
        keep_alive: true,
      },
    };
    expect(validateParams(connectorType, params, { configurationUtilities })).toEqual({
      method: 'GET',
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
      statusText: 'OK',
      data: { result: 'success' },
      headers: { 'content-type': 'application/json' },
      config: {},
    });
  });

  test('execute with username/password sends request with basic auth', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def',
      headers: {
        aheader: 'a value',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };
    await connectorType.executor?.({
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
      params: {
        method: 'POST',
        path: '/my-endpoint',
        body: 'some data',
      },
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
      method: 'POST',
      sslOverrides: {},
      url: 'https://abc.def/my-endpoint',
    });
  });

  test('execute with secret headers and basic auth', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def',
      headers: {
        aheader: 'a value',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };
    await connectorType.executor?.({
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
      params: {
        method: 'POST',
        path: '/my-endpoint',
        body: 'some data',
      },
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
      method: 'POST',
      sslOverrides: {},
      url: 'https://abc.def/my-endpoint',
    });
  });

  test('execute with secret headers and basic auth when header keys overlap', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def',
      headers: {
        aheader: 'a value',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };
    await connectorType.executor?.({
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
      params: {
        method: 'POST',
        path: '/my-endpoint',
        body: 'some data',
      },
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
      method: 'POST',
      sslOverrides: {},
      url: 'https://abc.def/my-endpoint',
    });
  });

  test('execute with ssl adds ssl settings to sslOverrides', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def',
      headers: {
        aheader: 'a value',
      },
      authType: AuthType.SSL,
      certType: SSLCertType.CRT,
      hasAuth: true,
    };
    await connectorType.executor?.({
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
      params: {
        method: 'POST',
        path: '/my-endpoint',
        body: 'some data',
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;

    expect(requestMock.mock.calls[0][0].sslOverrides).toMatchObject({
      cert: expect.any(Object),
      key: expect.any(Object),
      passphrase: 'passss',
    });
  });

  test('execute with exception maxContentLength size exceeded should log the proper error', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def',
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
    await connectorType.executor?.({
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
      params: {
        method: 'POST',
        path: '/my-endpoint',
        body: 'some data',
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });
    expect(mockedLogger.error).toBeCalledWith(
      'error on some-id http event: maxContentLength size of 1000000 exceeded'
    );
  });

  test('execute without username/password sends request without basic auth', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def',
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
    await connectorType.executor?.({
      actionId: 'some-id',
      services,
      config,
      secrets,
      params: {
        method: 'POST',
        path: '/my-endpoint',
        body: 'some data',
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    delete requestMock.mock.calls[0][0].configurationUtilities;
    expect(requestMock.mock.calls[0][0].headers).toEqual({
      aheader: 'a value',
    });
    expect(requestMock.mock.calls[0][0].url).toBe('https://abc.def/my-endpoint');
  });

  test('renders parameter templates as expected', async () => {
    const rogue = `double-quote:"; line-break->\n`;

    expect(connectorType.renderParameterTemplates).toBeTruthy();
    const paramsWithTemplates = {
      body: '{"x": "{{rogue}}"}',
      url: 'https://example.com/{{path}}',
      method: 'GET' as const,
      path: '/api/{{version}}',
      query: {
        key: '{{value}}',
      },
      headers: {
        'X-Custom': '{{headerValue}}',
      },
    };
    const variables = {
      rogue,
      path: 'test',
      version: 'v1',
      value: 'test-value',
      headerValue: 'test-header',
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
    expect(params.url).toBe('https://example.com/test');
    expect(params.path).toBe('/api/v1');
    expect(params.query?.key).toBe('test-value');
    expect(params.headers?.['X-Custom']).toBe('test-header');
  });

  test('execute combines base URL and path correctly', async () => {
    const config = {
      url: 'https://abc.def',
      authType: AuthType.Basic,
      hasAuth: true,
    } as ConnectorTypeConfigType;
    await connectorType.executor?.({
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
      params: {
        method: 'GET',
        path: '/api/v1/endpoint',
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(requestMock.mock.calls[0][0].url).toBe('https://abc.def/api/v1/endpoint');
  });

  test('execute combines base URL and path with query string', async () => {
    const config = {
      url: 'https://abc.def',
      authType: AuthType.Basic,
      hasAuth: true,
    } as ConnectorTypeConfigType;
    await connectorType.executor?.({
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
      params: {
        method: 'GET',
        path: '/api/v1/endpoint',
        query: {
          key1: 'value1',
          key2: 'value2',
        },
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(requestMock.mock.calls[0][0].url).toContain('https://abc.def/api/v1/endpoint?');
    expect(requestMock.mock.calls[0][0].url).toContain('key1=value1');
    expect(requestMock.mock.calls[0][0].url).toContain('key2=value2');
  });

  test('execute uses params.url when config.url is not provided', async () => {
    const config = {
      authType: AuthType.Basic,
      hasAuth: true,
    } as ConnectorTypeConfigType;
    await connectorType.executor?.({
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
      params: {
        method: 'GET',
        url: 'https://example.com',
        path: '/api/endpoint',
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(requestMock.mock.calls[0][0].url).toBe('https://example.com/api/endpoint');
  });

  test('execute returns error when URL is missing', async () => {
    const config = {
      authType: AuthType.Basic,
      hasAuth: true,
    } as ConnectorTypeConfigType;
    const result = await connectorType.executor?.({
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
      params: {
        method: 'GET',
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(result?.status).toBe('error');
    expect(result?.serviceMessage).toBe('URL is required');
  });

  test('execute merges params headers with config headers', async () => {
    const config: ConnectorTypeConfigType = {
      url: 'https://abc.def',
      headers: {
        'Config-Header': 'config-value',
      },
      authType: AuthType.Basic,
      hasAuth: true,
    };
    await connectorType.executor?.({
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
      params: {
        method: 'POST',
        path: '/my-endpoint',
        headers: {
          'Params-Header': 'params-value',
        },
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(requestMock.mock.calls[0][0].headers).toMatchObject({
      Authorization: 'Basic YWJjOjEyMw==',
      'Config-Header': 'config-value',
      'Params-Header': 'params-value',
    });
  });

  test('execute handles fetcher skip_ssl_verification', async () => {
    const config = {
      url: 'https://abc.def',
      authType: AuthType.Basic,
      hasAuth: true,
    } as ConnectorTypeConfigType;
    await connectorType.executor?.({
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
      params: {
        method: 'POST',
        path: '/my-endpoint',
        fetcher: {
          skip_ssl_verification: true,
        },
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(requestMock.mock.calls[0][0].sslOverrides).toMatchObject({
      verificationMode: 'none',
    });
  });

  test('execute handles fetcher follow_redirects false', async () => {
    const config = {
      url: 'https://abc.def',
      authType: AuthType.Basic,
      hasAuth: true,
    } as ConnectorTypeConfigType;
    await connectorType.executor?.({
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
      params: {
        method: 'POST',
        path: '/my-endpoint',
        fetcher: {
          follow_redirects: false,
        },
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(requestMock.mock.calls[0][0].maxRedirects).toBe(0);
  });

  test('execute handles fetcher max_redirects', async () => {
    const config = {
      url: 'https://abc.def',
      authType: AuthType.Basic,
      hasAuth: true,
    } as ConnectorTypeConfigType;
    await connectorType.executor?.({
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
      params: {
        method: 'POST',
        path: '/my-endpoint',
        fetcher: {
          max_redirects: 5,
        },
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(requestMock.mock.calls[0][0].maxRedirects).toBe(5);
  });

  test('execute handles fetcher keep_alive', async () => {
    const config = {
      url: 'https://abc.def',
      authType: AuthType.Basic,
      hasAuth: true,
    } as ConnectorTypeConfigType;
    await connectorType.executor?.({
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
      params: {
        method: 'POST',
        path: '/my-endpoint',
        fetcher: {
          keep_alive: true,
        },
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(requestMock.mock.calls[0][0].keepAlive).toBe(true);
  });

  test('execute returns response with status, statusText, headers, and data', async () => {
    const config = {
      url: 'https://abc.def',
      authType: AuthType.Basic,
      hasAuth: true,
    } as ConnectorTypeConfigType;
    const result = await connectorType.executor?.({
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
      params: {
        method: 'POST',
        path: '/my-endpoint',
        body: 'some data',
      },
      configurationUtilities,
      logger: mockedLogger,
      connectorUsageCollector,
    });

    expect(result?.status).toBe('ok');
    expect(result?.data).toMatchObject({
      status: 200,
      statusText: 'OK',
      headers: expect.any(Object),
      data: expect.any(Object),
    });
  });

  describe('error handling', () => {
    test.each([400, 404, 405, 406, 410, 411, 414, 428, 431])(
      'forwards user error source in result for %s error responses',
      async (status) => {
        const config = {
          url: 'https://abc.def',
          authType: AuthType.Basic,
          hasAuth: true,
        } as ConnectorTypeConfigType;

        requestMock.mockRejectedValueOnce(
          createTaskRunError(
            {
              tag: 'err',
              isAxiosError: true,
              response: {
                status,
                statusText: 'Not Found',
                data: {
                  message: 'The requested resource is not found.',
                },
              },
            } as unknown as Error,
            TaskErrorSource.USER
          )
        );
        const result = await connectorType.executor?.({
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
          params: {
            method: 'POST',
            path: '/my-endpoint',
            body: 'some data',
          },
          configurationUtilities,
          logger: mockedLogger,
          connectorUsageCollector,
        });

        expect(result?.errorSource).toBe('user');
      }
    );

    it('should log an error if refreshing access token fails', async () => {
      const errorMessage = 'Invalid client or Invalid client credentials';
      (getOAuthClientCredentialsAccessToken as jest.Mock).mockRejectedValueOnce(
        new Error(errorMessage)
      );
      createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);

      const execOptions: HttpConnectorTypeExecutorOptions = {
        actionId: 'test-id',
        config: {
          url: 'https://test.com',
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://token.url',
          clientId: 'client',
          headers: { 'X-Custom': 'value' },
        },
        params: {
          method: 'POST',
          path: '/endpoint',
          body: '{}',
        },
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

      await connectorType.executor?.(execOptions);

      expect(mockedLogger.error.mock.calls[0][0]).toMatchInlineSnapshot(
        `"ConnectorId \\"test-id\\": error \\"Unable to retrieve/refresh the access token: Invalid client or Invalid client credentials\\""`
      );
    });
  });

  describe('oauth2 client credentials', () => {
    it('returns error result if refresh token fails', async () => {
      (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValue(undefined);

      const execOptions: HttpConnectorTypeExecutorOptions = {
        actionId: 'test-id',
        config: {
          url: 'https://test.com',
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://token.url',
          clientId: 'client',
          headers: null,
        },
        params: {
          method: 'POST',
          path: '/endpoint',
          body: '{}',
        },
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

      const result = await connectorType.executor?.(execOptions);

      expect(result?.status).toBe('error');
      expect(result?.serviceMessage).toBe('Unable to retrieve new access token');
    });

    it('adds access token to headers', async () => {
      const accessToken = 'Bearer my-access-token';
      (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValueOnce(accessToken);
      createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);

      const execOptions: HttpConnectorTypeExecutorOptions = {
        actionId: 'test-id',
        config: {
          url: 'https://test.com',
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://token.url',
          clientId: 'client',
          headers: null,
        },
        params: {
          method: 'POST',
          path: '/endpoint',
          body: '{}',
        },
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

      await connectorType.executor?.(execOptions);

      expect((utils.request as jest.Mock).mock.calls[0][0].headers.Authorization).toBe(accessToken);
    });

    it('merges custom headers with Authorization header', async () => {
      const accessToken = 'Bearer token123';
      (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValueOnce(accessToken);
      createAxiosInstanceMock.mockReturnValue(axiosInstanceMock);

      const execOptions: HttpConnectorTypeExecutorOptions = {
        actionId: 'test-id',
        config: {
          url: 'https://test.com',
          hasAuth: true,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://token.url',
          clientId: 'client',
          headers: { 'X-Custom': 'value' },
        },
        params: {
          method: 'POST',
          path: '/endpoint',
          body: '{}',
        },
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

      await connectorType.executor?.(execOptions);

      const headers = (utils.request as jest.Mock).mock.calls[0][0].headers;
      expect(headers.Authorization).toBe(accessToken);
      expect(headers['X-Custom']).toBe('value');
    });
  });
});
