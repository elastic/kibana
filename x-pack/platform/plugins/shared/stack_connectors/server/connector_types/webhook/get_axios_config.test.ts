/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Services } from '@kbn/actions-plugin/server/types';
import { actionsConfigMock } from '@kbn/actions-plugin/server/actions_config.mock';
import type { Logger } from '@kbn/core/server';
import { loggerMock } from '@kbn/logging-mocks';
import { getAxiosConfig } from './get_axios_config';
import type { GetAxiosConfigParams, GetAxiosConfigResponse } from './get_axios_config';
import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import { getOAuthClientCredentialsAccessToken } from '@kbn/actions-plugin/server/lib/get_oauth_client_credentials_access_token';
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

const createMockAdapter =
  (status: number, data: unknown = {}) =>
  (config: AxiosRequestConfig): Promise<AxiosResponse> =>
    Promise.resolve({
      data,
      status,
      statusText: status === 401 ? 'Unauthorized' : 'OK',
      headers: { 'content-type': 'application/json' },
      config: config as AxiosResponse['config'],
    });

describe('getAxiosConfig', () => {
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

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should delete the token when the status is 401 but succeeds', async () => {
    (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValueOnce('fakeToken');

    const config = await getAxiosConfig(params);
    const { axiosInstance } = config[0] as GetAxiosConfigResponse;

    await axiosInstance.get('https://example.com/oauth/token', {
      adapter: createMockAdapter(401),
      validateStatus: () => true,
    });

    expect(services.connectorTokenClient.deleteConnectorTokens).toHaveBeenCalledWith({
      connectorId: 'test-action-id',
    });
  });

  it('should delete the token when the request fails', async () => {
    (getOAuthClientCredentialsAccessToken as jest.Mock).mockResolvedValueOnce('fakeToken');

    const config = await getAxiosConfig(params);
    const { axiosInstance } = config[0] as GetAxiosConfigResponse;

    await axiosInstance
      .get('https://example.com/oauth/token', {
        adapter: createMockAdapter(401, { error: 'fake_error' }),
      })
      .catch(() => {});

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
