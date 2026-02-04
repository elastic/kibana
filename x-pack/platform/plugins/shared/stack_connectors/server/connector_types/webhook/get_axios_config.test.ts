/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Services } from '@kbn/actions-plugin/server/types';
import { ConnectorUsageCollector } from '@kbn/actions-plugin/server/types';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { getAxiosConfig } from './get_axios_config';
import type { GetAxiosConfigParams, GetAxiosConfigResponse } from './get_axios_config';
import type { ActionsConfigurationUtilities } from '@kbn/actions-plugin/server/actions_config';
import { getOAuthClientCredentialsAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token';
import { request } from '@kbn/actions-plugin/server/lib/axios_utils';
import { promiseResult } from '../lib/result_type';
import sinon from 'sinon';
import { elasticsearchServiceMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { AuthType, WebhookMethods } from '@kbn/connector-schemas/common/auth';

jest.mock('@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token', () => ({
  getOAuthClientCredentialsAccessToken: jest.fn(),
}));

const createServicesMock = () => {
  const mock: jest.Mocked<
    Services & {
      savedObjectsClient: ReturnType<typeof savedObjectsClientMock.create>;
    }
  > = {
    savedObjectsClient: savedObjectsClientMock.create(),
    scopedClusterClient: elasticsearchServiceMock.createScopedClusterClient().asCurrentUser,
    connectorTokenClient: {
      deleteConnectorTokens: jest.fn(),
    } as unknown as jest.Mocked<Services['connectorTokenClient']>,
  };
  return mock;
};

describe('getAxiosConfig', () => {
  let server: sinon.SinonFakeServer;
  let connectorUsageCollector: ConnectorUsageCollector;
  let configurationUtilities: jest.Mocked<ActionsConfigurationUtilities>;
  const mockedLogger: jest.Mocked<Logger> = loggerMock.create();
  const services: Services = createServicesMock();

  const params: GetAxiosConfigParams = {
    connectorId: 'test-action-id',
    config: {
      authType: AuthType.OAuth2ClientCredentials,
      accessTokenUrl: 'https://example.com/oauth/token',
      clientId: 'test-client-id',
      scope: 'test-scope',
      additionalFields: '{}',
      headers: { 'Content-Type': 'application/json' },
      url: 'https://webhook.example.com',
      method: WebhookMethods.POST,
      hasAuth: true,
    },
    secrets: {
      clientSecret: 'test-client-secret',
      key: null,
      user: null,
      password: null,
      crt: null,
      pfx: null,
      secretHeaders: null,
    },
    services,
    configurationUtilities: actionsConfigMock.create(),
    logger: mockedLogger,
  };

  beforeEach(() => {
    server = sinon.useFakeServer();
    configurationUtilities = actionsConfigMock.create();
    connectorUsageCollector = new ConnectorUsageCollector({
      logger: mockedLogger,
      connectorId: 'test-connector-id',
    });
  });

  afterEach(() => {
    server.restore();
    jest.clearAllMocks();
  });

  it('should delete the token when the status is 401 but succeeds', async () => {
    (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValueOnce('fakeToken');
    server.respondWith('GET', 'https://example.com/oauth/token', [
      401,
      { 'Content-Type': 'application/json' },
      JSON.stringify({}),
    ]);

    const config = await getAxiosConfig(params);
    const { axiosInstance, headers } = config[0] as GetAxiosConfigResponse;
    const requestPromise = promiseResult(
      request({
        axios: axiosInstance,
        url: 'https://example.com/oauth/token',
        logger: mockedLogger,
        headers,
        configurationUtilities,
        connectorUsageCollector,
        // Allow all status codes for testing the onFulfilled interceptor
        validateStatus: () => true,
      })
    );

    server.respond();
    await requestPromise;

    expect(services.connectorTokenClient.deleteConnectorTokens).toHaveBeenCalledWith({
      connectorId: 'test-action-id',
    });
  });

  it('should delete the token when the request fails', async () => {
    (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValueOnce('fakeToken');
    server.respondWith('GET', 'https://example.com/oauth/token', [
      401,
      { 'Content-Type': 'application/json' },
      JSON.stringify({ error: 'fake_error' }),
    ]);

    const config = await getAxiosConfig(params);
    const { axiosInstance, headers } = config[0] as GetAxiosConfigResponse;

    const requestPromise = promiseResult(
      request({
        axios: axiosInstance,
        url: 'https://example.com/oauth/token',
        logger: mockedLogger,
        headers,
        configurationUtilities,
        connectorUsageCollector,
      })
    );

    server.respond();
    await requestPromise;

    expect(services.connectorTokenClient.deleteConnectorTokens).toHaveBeenCalledWith({
      connectorId: 'test-action-id',
    });
  });

  it('should return error when access token retrieval fails', async () => {
    (getOAuthClientCredentialsAccessToken as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to retrieve access token')
    );

    expect(((await getAxiosConfig(params))[1] as Error).message).toBe(
      'Unable to retrieve/refresh the access token: Failed to retrieve access token'
    );
  });

  it('should not return an error if secrets are undefined', async () => {
    const config = await getAxiosConfig({
      ...params,
      config: {
        ...params.config,
        authType: undefined,
        hasAuth: false,
      },
      // @ts-expect-error: should not happen but it does with very old SOs
      secrets: undefined,
    });

    expect(config[1]).toBeNull();
  });

  it('should not return an error if secrets are null', async () => {
    const config = await getAxiosConfig({
      ...params,
      config: {
        ...params.config,
        authType: undefined,
        hasAuth: false,
      },
      // @ts-expect-error: should not happen but it does with very old SOs
      secrets: null,
    });

    expect(config[1]).toBeNull();
  });
});
