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
import { getOAuthJwtAccessToken } from './get_oauth_jwt_access_token';
import { createJWTAssertion } from './create_jwt_assertion';
import { requestOAuthJWTToken } from './request_oauth_jwt_token';

jest.mock('./create_jwt_assertion', () => ({
  createJWTAssertion: jest.fn(),
}));
jest.mock('./request_oauth_jwt_token', () => ({
  requestOAuthJWTToken: jest.fn(),
}));

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

let clock: sinon.SinonFakeTimers;

describe('getOAuthJwtAccessToken', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
  });
  beforeEach(() => clock.reset());
  afterAll(() => clock.restore());

  const getOAuthJwtAccessTokenOpts = {
    connectorId: '123',
    logger,
    configurationUtilities,
    credentials: {
      config: {
        clientId: 'clientId',
        jwtKeyId: 'jwtKeyId',
        userIdentifierValue: 'userIdentifierValue',
      },
      secrets: {
        clientSecret: 'clientSecret',
        privateKey: 'privateKey',
        privateKeyPassword: 'privateKeyPassword',
      },
    },
    tokenUrl: 'https://dev23432523.service-now.com/oauth_token.do',
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
    const accessToken = await getOAuthJwtAccessToken(getOAuthJwtAccessTokenOpts);

    expect(accessToken).toEqual('testtokenvalue');
    expect(createJWTAssertion as jest.Mock).not.toHaveBeenCalled();
    expect(requestOAuthJWTToken as jest.Mock).not.toHaveBeenCalled();
  });

  test('creates new assertion if stored access token does not exist', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (createJWTAssertion as jest.Mock).mockReturnValueOnce('newassertion');
    (requestOAuthJWTToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'access_token',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });

    const accessToken = await getOAuthJwtAccessToken(getOAuthJwtAccessTokenOpts);

    expect(accessToken).toEqual('access_token brandnewaccesstoken');
    expect(createJWTAssertion as jest.Mock).toHaveBeenCalledWith(
      logger,
      'privateKey',
      'privateKeyPassword',
      {
        audience: 'clientId',
        issuer: 'clientId',
        subject: 'userIdentifierValue',
        keyId: 'jwtKeyId',
      }
    );
    expect(requestOAuthJWTToken as jest.Mock).toHaveBeenCalledWith(
      'https://dev23432523.service-now.com/oauth_token.do',
      { clientId: 'clientId', clientSecret: 'clientSecret', assertion: 'newassertion' },
      logger,
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
    (createJWTAssertion as jest.Mock).mockReturnValueOnce('newassertion');
    (requestOAuthJWTToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'access_token',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });

    const accessToken = await getOAuthJwtAccessToken(getOAuthJwtAccessTokenOpts);

    expect(accessToken).toEqual('access_token brandnewaccesstoken');
    expect(createJWTAssertion as jest.Mock).toHaveBeenCalledWith(
      logger,
      'privateKey',
      'privateKeyPassword',
      {
        audience: 'clientId',
        issuer: 'clientId',
        subject: 'userIdentifierValue',
        keyId: 'jwtKeyId',
      }
    );
    expect(requestOAuthJWTToken as jest.Mock).toHaveBeenCalledWith(
      'https://dev23432523.service-now.com/oauth_token.do',
      { clientId: 'clientId', clientSecret: 'clientSecret', assertion: 'newassertion' },
      logger,
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
      tokenRequestDate: 1609502400000,
      newToken: 'access_token brandnewaccesstoken',
      expiresInSec: 1000,
      deleteExisting: false,
    });
  });

  test('returns null and logs warning if any required fields are missing', async () => {
    await asyncForEach(
      ['clientId', 'jwtKeyId', 'userIdentifierValue'],
      async (configField: string) => {
        const accessToken = await getOAuthJwtAccessToken({
          ...getOAuthJwtAccessTokenOpts,
          credentials: {
            config: { ...getOAuthJwtAccessTokenOpts.credentials.config, [configField]: null },
            secrets: getOAuthJwtAccessTokenOpts.credentials.secrets,
          },
        });
        expect(accessToken).toBeNull();
        expect(logger.warn).toHaveBeenCalledWith(
          `Missing required fields for requesting OAuth JWT access token`
        );
      }
    );

    await asyncForEach(['clientSecret', 'privateKey'], async (secretsField: string) => {
      const accessToken = await getOAuthJwtAccessToken({
        ...getOAuthJwtAccessTokenOpts,
        credentials: {
          config: getOAuthJwtAccessTokenOpts.credentials.config,
          secrets: { ...getOAuthJwtAccessTokenOpts.credentials.secrets, [secretsField]: null },
        },
      });
      expect(accessToken).toBeNull();
      expect(logger.warn).toHaveBeenCalledWith(
        `Missing required fields for requesting OAuth JWT access token`
      );
    });
  });

  test('throws error if createJWTAssertion throws error', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (createJWTAssertion as jest.Mock).mockImplementationOnce(() => {
      throw new Error('createJWTAssertion error!!');
    });

    await expect(
      getOAuthJwtAccessToken(getOAuthJwtAccessTokenOpts)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"createJWTAssertion error!!"`);
  });

  test('throws error if requestOAuthJWTToken throws error', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (createJWTAssertion as jest.Mock).mockReturnValueOnce('newassertion');
    (requestOAuthJWTToken as jest.Mock).mockRejectedValueOnce(
      new Error('requestOAuthJWTToken error!!')
    );

    await expect(
      getOAuthJwtAccessToken(getOAuthJwtAccessTokenOpts)
    ).rejects.toThrowErrorMatchingInlineSnapshot(`"requestOAuthJWTToken error!!"`);
  });

  test('logs warning if connectorTokenClient.updateOrReplace throws error', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (createJWTAssertion as jest.Mock).mockReturnValueOnce('newassertion');
    (requestOAuthJWTToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'access_token',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });
    connectorTokenClient.updateOrReplace.mockRejectedValueOnce(new Error('updateOrReplace error'));

    const accessToken = await getOAuthJwtAccessToken(getOAuthJwtAccessTokenOpts);

    expect(accessToken).toEqual('access_token brandnewaccesstoken');
    expect(logger.warn).toHaveBeenCalledWith(
      `Not able to update connector token for connectorId: 123 due to error: updateOrReplace error`
    );
  });

  test('gets access token if connectorId is not provided', async () => {
    (createJWTAssertion as jest.Mock).mockReturnValueOnce('newassertion');
    (requestOAuthJWTToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'access_token',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });

    const accessToken = await getOAuthJwtAccessToken({
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: 'clientId',
          jwtKeyId: 'jwtKeyId',
          userIdentifierValue: 'userIdentifierValue',
        },
        secrets: {
          clientSecret: 'clientSecret',
          privateKey: 'privateKey',
          privateKeyPassword: 'privateKeyPassword',
        },
      },
      tokenUrl: 'https://dev23432523.service-now.com/oauth_token.do',
      connectorTokenClient,
    });

    expect(connectorTokenClient.get).not.toHaveBeenCalled();
    expect(connectorTokenClient.updateOrReplace).not.toHaveBeenCalled();
    expect(accessToken).toEqual('access_token brandnewaccesstoken');
    expect(createJWTAssertion as jest.Mock).toHaveBeenCalledWith(
      logger,
      'privateKey',
      'privateKeyPassword',
      {
        audience: 'clientId',
        issuer: 'clientId',
        subject: 'userIdentifierValue',
        keyId: 'jwtKeyId',
      }
    );
    expect(requestOAuthJWTToken as jest.Mock).toHaveBeenCalledWith(
      'https://dev23432523.service-now.com/oauth_token.do',
      { clientId: 'clientId', clientSecret: 'clientSecret', assertion: 'newassertion' },
      logger,
      configurationUtilities
    );
  });

  test('gets access token if connectorTokenClient is not provided', async () => {
    (createJWTAssertion as jest.Mock).mockReturnValueOnce('newassertion');
    (requestOAuthJWTToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'access_token',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });

    const accessToken = await getOAuthJwtAccessToken({
      connectorId: '123',
      logger,
      configurationUtilities,
      credentials: {
        config: {
          clientId: 'clientId',
          jwtKeyId: 'jwtKeyId',
          userIdentifierValue: 'userIdentifierValue',
        },
        secrets: {
          clientSecret: 'clientSecret',
          privateKey: 'privateKey',
          privateKeyPassword: 'privateKeyPassword',
        },
      },
      tokenUrl: 'https://dev23432523.service-now.com/oauth_token.do',
    });

    expect(connectorTokenClient.get).not.toHaveBeenCalled();
    expect(connectorTokenClient.updateOrReplace).not.toHaveBeenCalled();
    expect(accessToken).toEqual('access_token brandnewaccesstoken');
    expect(createJWTAssertion as jest.Mock).toHaveBeenCalledWith(
      logger,
      'privateKey',
      'privateKeyPassword',
      {
        audience: 'clientId',
        issuer: 'clientId',
        subject: 'userIdentifierValue',
        keyId: 'jwtKeyId',
      }
    );
    expect(requestOAuthJWTToken as jest.Mock).toHaveBeenCalledWith(
      'https://dev23432523.service-now.com/oauth_token.do',
      { clientId: 'clientId', clientSecret: 'clientSecret', assertion: 'newassertion' },
      logger,
      configurationUtilities
    );
  });
});
