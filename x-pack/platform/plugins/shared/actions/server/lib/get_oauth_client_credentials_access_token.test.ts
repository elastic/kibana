/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import sinon from 'sinon';
import { Logger } from '@kbn/core/server';
import { asyncForEach } from '@kbn/std';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { connectorTokenClientMock } from './connector_token_client.mock';
import { getOAuthClientCredentialsAccessToken } from './get_oauth_client_credentials_access_token';
import { requestOAuthClientCredentialsToken } from './request_oauth_client_credentials_token';

jest.mock('./request_oauth_client_credentials_token', () => ({
  requestOAuthClientCredentialsToken: jest.fn(),
}));

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

let clock: sinon.SinonFakeTimers;

describe('getOAuthClientCredentialsAccessToken', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
  });
  beforeEach(() => clock.reset());
  afterAll(() => clock.restore());

  const getOAuthClientCredentialsAccessTokenOpts = {
    connectorId: '123',
    logger,
    configurationUtilities,
    credentials: {
      config: {
        clientId: 'clientId',
        tenantId: 'tenantId',
      },
      secrets: {
        clientSecret: 'clientSecret',
      },
    },
    oAuthScope: 'https://graph.microsoft.com/.default',
    tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
    connectorTokenClient,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test('uses stored access token if it exists', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date('2021-01-01T08:00:00.000Z').toISOString(),
        expiresAt: new Date('2021-01-02T13:00:00.000Z').toISOString(),
      },
    });
    const accessToken = await getOAuthClientCredentialsAccessToken(
      getOAuthClientCredentialsAccessTokenOpts
    );

    expect(accessToken).toEqual('testtokenvalue');
    expect(requestOAuthClientCredentialsToken as jest.Mock).not.toHaveBeenCalled();
  });

  test('creates new assertion if stored access token does not exist', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (requestOAuthClientCredentialsToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'access_token',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });

    const accessToken = await getOAuthClientCredentialsAccessToken(
      getOAuthClientCredentialsAccessTokenOpts
    );

    expect(accessToken).toEqual('access_token brandnewaccesstoken');
    expect(requestOAuthClientCredentialsToken as jest.Mock).toHaveBeenCalledWith(
      'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
      logger,
      {
        scope: 'https://graph.microsoft.com/.default',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
      },

      configurationUtilities
    );
    expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledWith({
      connectorId: '123',
      token: null,
      newToken: 'access_token brandnewaccesstoken',
      tokenRequestDate: 1609502400000,
      expiresInSec: 1000,
      deleteExisting: false,
    });
  });

  test('creates new assertion if stored access token exists but is expired', async () => {
    const createdAt = new Date('2021-01-01T08:00:00.000Z').toISOString();
    const expiresAt = new Date('2021-01-01T09:00:00.000Z').toISOString();
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt,
        expiresAt,
      },
    });
    (requestOAuthClientCredentialsToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'access_token',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });

    const accessToken = await getOAuthClientCredentialsAccessToken(
      getOAuthClientCredentialsAccessTokenOpts
    );

    expect(accessToken).toEqual('access_token brandnewaccesstoken');
    expect(requestOAuthClientCredentialsToken as jest.Mock).toHaveBeenCalledWith(
      'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
      logger,
      {
        scope: 'https://graph.microsoft.com/.default',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
      },

      configurationUtilities
    );
    expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledWith({
      connectorId: '123',
      token: {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt,
        expiresAt,
      },
      newToken: 'access_token brandnewaccesstoken',
      tokenRequestDate: 1609502400000,
      expiresInSec: 1000,
      deleteExisting: false,
    });
  });

  test('returns null and logs warning if any required fields are missing', async () => {
    await asyncForEach(['clientId', 'tenantId'], async (configField: string) => {
      const accessToken = await getOAuthClientCredentialsAccessToken({
        ...getOAuthClientCredentialsAccessTokenOpts,
        credentials: {
          config: {
            ...getOAuthClientCredentialsAccessTokenOpts.credentials.config,
            [configField]: null,
          },
          secrets: getOAuthClientCredentialsAccessTokenOpts.credentials.secrets,
        },
      });
      expect(accessToken).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        `Missing required fields for requesting OAuth Client Credentials access token`
      );
    });

    await asyncForEach(['clientSecret'], async (secretsField: string) => {
      const accessToken = await getOAuthClientCredentialsAccessToken({
        ...getOAuthClientCredentialsAccessTokenOpts,
        credentials: {
          config: getOAuthClientCredentialsAccessTokenOpts.credentials.config,
          secrets: {
            ...getOAuthClientCredentialsAccessTokenOpts.credentials.secrets,
            [secretsField]: null,
          },
        },
      });
      expect(accessToken).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        `Missing required fields for requesting OAuth Client Credentials access token`
      );
    });
  });

  test('throws error if requestOAuthClientCredentialsToken throws error', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (requestOAuthClientCredentialsToken as jest.Mock).mockRejectedValueOnce(
      new Error('requestOAuthClientCredentialsToken error!!')
    );

    await expect(
      getOAuthClientCredentialsAccessToken(getOAuthClientCredentialsAccessTokenOpts)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"requestOAuthClientCredentialsToken error!!"`);
  });

  test('logs warning if connectorTokenClient.updateOrReplace throws error', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (requestOAuthClientCredentialsToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'access_token',
      accessToken: 'brandnewaccesstoken',
      tokenRequestDate: 1609502400000,
      expiresIn: 1000,
    });
    connectorTokenClient.updateOrReplace.mockRejectedValueOnce(new Error('updateOrReplace error'));

    const accessToken = await getOAuthClientCredentialsAccessToken(
      getOAuthClientCredentialsAccessTokenOpts
    );

    expect(accessToken).toEqual('access_token brandnewaccesstoken');
    expect(logger.warn).toHaveBeenCalledWith(
      `Not able to update connector token for connectorId: 123 due to error: updateOrReplace error`
    );
  });

  test('gets access token if connectorId is not provided', async () => {
    (requestOAuthClientCredentialsToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'access_token',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });

    const accessToken = await getOAuthClientCredentialsAccessToken({
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: 'clientId',
          tenantId: 'tenantId',
        },
        secrets: {
          clientSecret: 'clientSecret',
        },
      },
      oAuthScope: 'https://graph.microsoft.com/.default',
      tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
      connectorTokenClient,
    });

    expect(connectorTokenClient.get).not.toHaveBeenCalled();
    expect(connectorTokenClient.updateOrReplace).not.toHaveBeenCalled();
    expect(accessToken).toEqual('access_token brandnewaccesstoken');
    expect(requestOAuthClientCredentialsToken as jest.Mock).toHaveBeenCalledWith(
      'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
      logger,
      {
        scope: 'https://graph.microsoft.com/.default',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
      },

      configurationUtilities
    );
  });

  test('gets access token if connectorTokenClient is not provided', async () => {
    (requestOAuthClientCredentialsToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'access_token',
      accessToken: 'brandnewaccesstoken',
      tokenRequestDate: 1609502400000,
      expiresIn: 1000,
    });

    const accessToken = await getOAuthClientCredentialsAccessToken({
      connectorId: '123',
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: 'clientId',
          tenantId: 'tenantId',
        },
        secrets: {
          clientSecret: 'clientSecret',
        },
      },
      oAuthScope: 'https://graph.microsoft.com/.default',
      tokenUrl: 'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
    });

    expect(connectorTokenClient.get).not.toHaveBeenCalled();
    expect(connectorTokenClient.updateOrReplace).not.toHaveBeenCalled();
    expect(accessToken).toEqual('access_token brandnewaccesstoken');
    expect(requestOAuthClientCredentialsToken as jest.Mock).toHaveBeenCalledWith(
      'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
      logger,
      {
        scope: 'https://graph.microsoft.com/.default',
        clientId: 'clientId',
        clientSecret: 'clientSecret',
      },

      configurationUtilities
    );
  });
});
