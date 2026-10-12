/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Services } from '@kbn/actions-plugin/server/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { validateConfig } from '@kbn/actions-plugin/server/lib';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { actionsMock } from '@kbn/actions-plugin/server/mocks';
import * as utils from '@kbn/actions-plugin/server/lib/axios_utils';
import { getOAuthClientCredentialsAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { TaskErrorSource } from '@kbn/task-manager-plugin/common';
import { AuthType } from '@kbn/connector-schemas/common/auth';
import type {
  ActionParamsType,
  ConnectorTypeConfigType,
  ConnectorTypeSecretsType,
} from '@kbn/connector-schemas/http';
import type {
  GetPrivateLocationRunner,
  PrivateLocationHttpResponse,
  PrivateLocationRunner,
} from '../../private_location';
import type { HttpConnectorType, HttpConnectorTypeExecutorOptions } from './types';
import { executor, getConnectorType } from './http_connector';

jest.mock('@kbn/actions-plugin/server/lib/axios_utils', () => {
  const originalUtils = jest.requireActual('@kbn/actions-plugin/server/lib/axios_utils');
  return {
    ...originalUtils,
    request: jest.fn(),
  };
});

jest.mock('@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token', () => ({
  getOAuthClientCredentialsAccessToken: jest.fn(),
}));

const requestMock = utils.request as jest.Mock;
const getAccessTokenMock = getOAuthClientCredentialsAccessToken as jest.Mock;
const logger = loggerMock.create();

const secrets: ConnectorTypeSecretsType = {
  user: 'abc',
  password: '123',
  key: null,
  crt: null,
  pfx: null,
  clientSecret: null,
  secretHeaders: null,
  proxyUsername: null,
  proxyPassword: null,
  secretQueryParams: { token: 'secret-token' },
};

const baseConfig: ConnectorTypeConfigType = {
  url: 'https://jenkins.internal/api',
  headers: { 'X-Team': 'ops' },
  hasAuth: true,
  authType: AuthType.Basic,
  proxyUrl: null,
  hasProxyAuth: false,
  privateLocation: 'internal-net',
};

const baseParams: ActionParamsType = {
  method: 'POST',
  path: '/job/deploy',
  body: { event: 'deploy' },
};

const okResponse: PrivateLocationHttpResponse = {
  statusCode: 200,
  headers: { 'content-type': 'application/json' },
  body: '{"queued":true}',
  bodyTruncated: false,
};

describe('http connector with a private location', () => {
  let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;
  let services: Services;
  let runner: jest.Mocked<PrivateLocationRunner>;
  let connectorType: HttpConnectorType;

  const execute = (
    overrides: Partial<HttpConnectorTypeExecutorOptions> = {},
    {
      isSystem = false,
      getPrivateLocationRunner = () => runner,
    }: { isSystem?: boolean; getPrivateLocationRunner?: GetPrivateLocationRunner } = {}
  ) =>
    executor(
      {
        actionId: 'connector-1',
        services,
        config: baseConfig,
        secrets,
        params: baseParams,
        configurationUtilities,
        logger,
        connectorUsageCollector: new ConnectorUsageCollector({
          logger,
          connectorId: 'connector-1',
        }),
        request: httpServerMock.createKibanaRequest(),
        ...overrides,
      },
      { isSystem, getPrivateLocationRunner }
    );

  beforeEach(() => {
    jest.clearAllMocks();
    configurationUtilities = actionsConfigMock.create();
    services = actionsMock.createServices();
    runner = { execute: jest.fn().mockResolvedValue(okResponse) };
    connectorType = getConnectorType({ getPrivateLocationRunner: () => runner });
  });

  describe('config validation', () => {
    test('accepts a private location with basic auth', () => {
      expect(validateConfig(connectorType, baseConfig, { configurationUtilities })).toEqual(
        expect.objectContaining({ privateLocation: 'internal-net' })
      );
    });

    test('rejects SSL authentication, a custom CA, weakened verification, and a proxy', () => {
      expect(() =>
        validateConfig(
          connectorType,
          {
            ...baseConfig,
            authType: AuthType.SSL,
            ca: 'some-ca',
            verificationMode: 'none',
            proxyUrl: 'http://proxy.internal:8080',
          },
          { configurationUtilities }
        )
      ).toThrowErrorMatchingInlineSnapshot(
        `"error validating connector type config: error validation http action config: SSL authentication (authType), custom CA certificate (ca), verificationMode \\"none\\", proxy (proxyUrl) cannot be used with a private location"`
      );
    });
  });

  describe('saved connector', () => {
    test('sends the request through the runner and returns the processed response', async () => {
      const kibanaRequest = httpServerMock.createKibanaRequest();

      const result = await execute({ request: kibanaRequest });

      expect(requestMock).not.toHaveBeenCalled();
      expect(runner.execute).toHaveBeenCalledWith({
        privateLocation: 'internal-net',
        connectorId: 'connector-1',
        kibanaRequest,
        signal: undefined,
        request: {
          method: 'POST',
          url: 'https://jenkins.internal/api/job/deploy?token=secret-token',
          headers: { 'X-Team': 'ops', Authorization: 'Basic YWJjOjEyMw==' },
          body: '{"event":"deploy"}',
          maxRedirects: 10,
          maxResponseBytes: undefined,
          timeoutSeconds: 360,
        },
      });
      expect(result).toEqual({
        status: 'ok',
        actionId: 'connector-1',
        data: {
          status: 200,
          statusText: 'OK',
          headers: { 'content-type': 'application/json' },
          data: { queued: true },
        },
      });
    });

    test('rejects private_location in params', async () => {
      const result = await execute({
        params: { ...baseParams, private_location: 'other-net' },
      });

      expect(runner.execute).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          status: 'error',
          serviceMessage:
            'private_location can only be set when running without a connector; set the private location on the connector instead',
        })
      );
    });

    test('sends the request directly when no private location is configured', async () => {
      requestMock.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, data: null });

      await execute({ config: { ...baseConfig, privateLocation: undefined } });

      expect(runner.execute).not.toHaveBeenCalled();
      expect(requestMock).toHaveBeenCalled();
    });
  });

  describe('system connector (no connector-id)', () => {
    test('uses private_location from params', async () => {
      await execute(
        {
          config: {} as ConnectorTypeConfigType,
          secrets: {} as ConnectorTypeSecretsType,
          params: {
            method: 'GET',
            url: 'https://status.internal/health',
            private_location: 'internal-net',
          },
        },
        { isSystem: true }
      );

      expect(runner.execute.mock.calls[0][0]).toEqual(
        expect.objectContaining({
          privateLocation: 'internal-net',
          request: expect.objectContaining({
            method: 'GET',
            url: 'https://status.internal/health',
            headers: {},
          }),
        })
      );
    });

    test('sends the request directly without private_location', async () => {
      requestMock.mockResolvedValue({ status: 200, statusText: 'OK', headers: {}, data: null });

      await execute(
        {
          config: {} as ConnectorTypeConfigType,
          secrets: {} as ConnectorTypeSecretsType,
          params: { method: 'GET', url: 'https://status.example.com/health' },
        },
        { isSystem: true }
      );

      expect(runner.execute).not.toHaveBeenCalled();
      expect(requestMock).toHaveBeenCalled();
    });
  });

  describe('fetcher options', () => {
    test('maps redirect and response size options', async () => {
      await execute({
        params: {
          ...baseParams,
          fetcher: { max_redirects: 3, max_content_length: 2048.5 },
        },
      });

      expect(runner.execute.mock.calls[0][0].request).toEqual(
        expect.objectContaining({ maxRedirects: 3, maxResponseBytes: 2048 })
      );
    });

    test('disables redirects when follow_redirects is false', async () => {
      await execute({ params: { ...baseParams, fetcher: { follow_redirects: false } } });

      expect(runner.execute.mock.calls[0][0].request.maxRedirects).toBe(0);
    });

    test('caps redirects at the agent limit', async () => {
      await execute({ params: { ...baseParams, fetcher: { max_redirects: 50 } } });

      expect(runner.execute.mock.calls[0][0].request.maxRedirects).toBe(10);
    });

    test('rejects skip_ssl_verification', async () => {
      const result = await execute({
        params: { ...baseParams, fetcher: { skip_ssl_verification: true } },
      });

      expect(runner.execute).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          status: 'error',
          serviceMessage: 'fetcher.skip_ssl_verification cannot be used with a private location',
        })
      );
    });

    test('rejects form_data', async () => {
      const result = await execute({
        params: {
          method: 'POST',
          form_data: { file: { content: 'hello', filename: 'a.txt' } },
        },
      });

      expect(runner.execute).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          status: 'error',
          serviceMessage: 'form_data cannot be used with a private location',
        })
      );
    });
  });

  describe('failures', () => {
    test('fails when no runner is registered', async () => {
      const result = await execute({}, { getPrivateLocationRunner: () => undefined });

      expect(result).toEqual(
        expect.objectContaining({
          status: 'error',
          serviceMessage:
            'private location "internal-net" cannot be used: private locations are not available',
        })
      );
    });

    test('checks the URL against the allowed hosts', async () => {
      configurationUtilities.ensureUriAllowed.mockImplementation(() => {
        throw new Error('target url not in allowed hosts');
      });

      const result = await execute();

      expect(runner.execute).not.toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          status: 'error',
          serviceMessage: 'target url not in allowed hosts',
        })
      );
    });

    test('reports runner failures as request failures', async () => {
      runner.execute.mockRejectedValue(new Error('no online agents'));

      const result = await execute();

      expect(result).toEqual(
        expect.objectContaining({
          status: 'error',
          serviceMessage: '[private location "internal-net"] no online agents',
        })
      );
    });

    test('reports truncated responses with the axios size limit message', async () => {
      runner.execute.mockResolvedValue({ ...okResponse, bodyTruncated: true });

      const result = await execute({
        params: { ...baseParams, fetcher: { max_content_length: 100 } },
      });

      expect(result).toEqual(
        expect.objectContaining({
          status: 'error',
          serviceMessage: 'maxContentLength size of 100 exceeded',
        })
      );
    });

    test('maps 4xx responses to user errors with the response message', async () => {
      runner.execute.mockResolvedValue({
        ...okResponse,
        statusCode: 404,
        body: '{"message":"no such job"}',
      });

      const result = await execute();

      expect(result).toEqual(
        expect.objectContaining({
          status: 'error',
          serviceMessage: '[404] Not Found: no such job',
          errorSource: TaskErrorSource.USER,
        })
      );
    });

    test('retries 5xx responses', async () => {
      runner.execute.mockResolvedValue({ ...okResponse, statusCode: 503, body: '' });

      const result = await execute();

      expect(result).toEqual(expect.objectContaining({ status: 'error', retry: true }));
    });

    test('honours retry-after on 429 responses', async () => {
      runner.execute.mockResolvedValue({
        ...okResponse,
        statusCode: 429,
        headers: { 'retry-after': '15' },
        body: '',
      });

      const result = await execute();

      expect(result).toEqual(expect.objectContaining({ status: 'error', retry: expect.any(Date) }));
    });

    test('deletes the cached OAuth2 token on 4xx responses', async () => {
      const deleteConnectorTokens = jest
        .spyOn(services.connectorTokenClient, 'deleteConnectorTokens')
        .mockResolvedValue(undefined);
      getAccessTokenMock.mockResolvedValue('Bearer cached-token');
      runner.execute.mockResolvedValue({ ...okResponse, statusCode: 401, body: '' });

      await execute({
        config: {
          ...baseConfig,
          authType: AuthType.OAuth2ClientCredentials,
          accessTokenUrl: 'https://login.example.com/token',
          clientId: 'client',
        },
        secrets: { ...secrets, user: null, password: null, clientSecret: 'secret' },
      });

      expect(runner.execute.mock.calls[0][0].request.headers).toEqual(
        expect.objectContaining({ Authorization: 'Bearer cached-token' })
      );
      expect(deleteConnectorTokens).toHaveBeenCalledWith({ connectorId: 'connector-1' });
    });
  });
});
