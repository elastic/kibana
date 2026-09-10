/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import sinon from 'sinon';
import type { Logger } from '@kbn/core/server';
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

  const defaultAdditionalFields = { custom_param: 'value' };
  const getOAuthClientCredentialsAccessTokenOpts = {
    connectorId: '123',
    logger,
    configurationUtilities,
    credentials: {
      type: 'client_secret' as const,
      config: {
        clientId: 'clientId',
        additionalFields: defaultAdditionalFields,
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
        ...defaultAdditionalFields,
      },
      configurationUtilities,
      undefined
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
        ...defaultAdditionalFields,
      },
      configurationUtilities,
      undefined
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

  test('passes additionalFields object properties spread into requestOAuthClientCredentialsToken options', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (requestOAuthClientCredentialsToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'access_token',
      accessToken: 'tokenwithfields',
      expiresIn: 500,
    });

    const specificAdditionalFields = { another_param: 'test', numeric: 123 };
    const optsWithSpecificFields = {
      ...getOAuthClientCredentialsAccessTokenOpts,
      credentials: {
        ...getOAuthClientCredentialsAccessTokenOpts.credentials,
        config: {
          ...getOAuthClientCredentialsAccessTokenOpts.credentials.config,
          additionalFields: specificAdditionalFields,
        },
      } as const,
    };

    await getOAuthClientCredentialsAccessToken(optsWithSpecificFields);

    expect(requestOAuthClientCredentialsToken as jest.Mock).toHaveBeenCalledWith(
      expect.any(String), // tokenUrl
      expect.any(Object), // logger
      // Use objectContaining with spread properties
      expect.objectContaining({
        clientId: 'clientId',
        clientSecret: 'clientSecret',
        scope: 'https://graph.microsoft.com/.default',
        ...specificAdditionalFields,
      }),
      expect.any(Object), // configurationUtilities
      undefined
    );
  });

  test('returns null and logs warning if clientId is missing', async () => {
    const accessToken = await getOAuthClientCredentialsAccessToken({
      ...getOAuthClientCredentialsAccessTokenOpts,
      credentials: {
        type: 'client_secret',
        config: {
          ...getOAuthClientCredentialsAccessTokenOpts.credentials.config,
          clientId: '',
        },
        secrets: getOAuthClientCredentialsAccessTokenOpts.credentials.secrets,
      },
    });
    expect(accessToken).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      `Missing required fields for requesting OAuth Client Credentials access token`
    );
  });

  test('returns null and logs warning when clientSecret is missing in client_secret mode', async () => {
    const accessToken = await getOAuthClientCredentialsAccessToken({
      ...getOAuthClientCredentialsAccessTokenOpts,
      credentials: {
        type: 'client_secret',
        config: { clientId: 'clientId' },
        secrets: { clientSecret: '' },
      },
    });

    expect(accessToken).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      `Missing required fields for requesting OAuth Client Credentials access token`
    );
    expect(requestOAuthClientCredentialsToken as jest.Mock).not.toHaveBeenCalled();
  });

  test('requests new token in client_assertion mode using buildAdditionalFields lazily', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (requestOAuthClientCredentialsToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'Bearer',
      accessToken: 'assertion-token',
      expiresIn: 1000,
    });

    const buildAdditionalFields = jest.fn().mockReturnValue({
      client_assertion: 'signed.jwt.assertion',
      client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
    });

    const accessToken = await getOAuthClientCredentialsAccessToken({
      ...getOAuthClientCredentialsAccessTokenOpts,
      credentials: {
        type: 'client_assertion',
        config: {
          clientId: 'clientId',
          buildAdditionalFields,
        },
      },
    });

    expect(accessToken).toEqual('Bearer assertion-token');
    expect(buildAdditionalFields).toHaveBeenCalledTimes(1);
    expect(logger.warn).not.toHaveBeenCalled();
    expect(requestOAuthClientCredentialsToken as jest.Mock).toHaveBeenCalledWith(
      'https://login.microsoftonline.com/98765/oauth2/v2.0/token',
      logger,
      {
        scope: 'https://graph.microsoft.com/.default',
        clientId: 'clientId',
        client_assertion: 'signed.jwt.assertion',
        client_assertion_type: 'urn:ietf:params:oauth:client-assertion-type:jwt-bearer',
      },
      configurationUtilities,
      undefined
    );
  });

  test('does not invoke buildAdditionalFields on a cache hit', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'Bearer cached',
        createdAt: new Date(Date.now() - 1000).toISOString(),
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
      },
    });

    const buildAdditionalFields = jest.fn();

    const accessToken = await getOAuthClientCredentialsAccessToken({
      ...getOAuthClientCredentialsAccessTokenOpts,
      credentials: {
        type: 'client_assertion',
        config: { clientId: 'clientId', buildAdditionalFields },
      },
    });

    expect(accessToken).toEqual('Bearer cached');
    expect(buildAdditionalFields).not.toHaveBeenCalled();
    expect(requestOAuthClientCredentialsToken as jest.Mock).not.toHaveBeenCalled();
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
        type: 'client_secret',
        config: {
          clientId: 'clientId',
          additionalFields: defaultAdditionalFields,
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
        ...defaultAdditionalFields,
      },
      configurationUtilities,
      undefined
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
        type: 'client_secret',
        config: {
          clientId: 'clientId',
          additionalFields: defaultAdditionalFields,
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
        ...defaultAdditionalFields,
      },
      configurationUtilities,
      undefined
    );
  });
});
