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
import { getOAuthPasswordAccessToken } from './get_oauth_password_access_token';
import { requestOAuthPasswordToken } from './request_oauth_password_token';

jest.mock('./request_oauth_password_token', () => ({
  requestOAuthPasswordToken: jest.fn(),
}));

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

let clock: sinon.SinonFakeTimers;

describe('getOAuthPasswordAccessToken', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
  });
  beforeEach(() => clock.reset());
  afterAll(() => clock.restore());

  const opts = {
    connectorId: '123',
    logger,
    configurationUtilities,
    username: 'my-user',
    password: 'my-password',
    tokenUrl: 'https://example.com/oauth/token',
    connectorTokenClient,
  };

  beforeEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  test('uses stored access token if it exists and is not expired', async () => {
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

    const accessToken = await getOAuthPasswordAccessToken(opts);

    expect(accessToken).toEqual('testtokenvalue');
    expect(requestOAuthPasswordToken as jest.Mock).not.toHaveBeenCalled();
  });

  test('requests a new token if stored token does not exist', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (requestOAuthPasswordToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'Bearer',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });

    const accessToken = await getOAuthPasswordAccessToken(opts);

    expect(accessToken).toEqual('Bearer brandnewaccesstoken');
    expect(requestOAuthPasswordToken as jest.Mock).toHaveBeenCalledWith(
      'https://example.com/oauth/token',
      logger,
      { username: 'my-user', password: 'my-password' },
      configurationUtilities
    );
    expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledWith({
      connectorId: '123',
      token: null,
      newToken: 'Bearer brandnewaccesstoken',
      tokenRequestDate: 1609502400000,
      expiresInSec: 1000,
      deleteExisting: false,
    });
  });

  test('requests a new token if the stored token is expired', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'testtokenvalue',
        createdAt: new Date('2021-01-01T08:00:00.000Z').toISOString(),
        expiresAt: new Date('2021-01-01T09:00:00.000Z').toISOString(),
      },
    });
    (requestOAuthPasswordToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'Bearer',
      accessToken: 'refreshedtoken',
      expiresIn: 1000,
    });

    const accessToken = await getOAuthPasswordAccessToken(opts);

    expect(accessToken).toEqual('Bearer refreshedtoken');
    expect(requestOAuthPasswordToken as jest.Mock).toHaveBeenCalledTimes(1);
  });

  test('returns null and logs a warning if username is missing', async () => {
    const accessToken = await getOAuthPasswordAccessToken({ ...opts, username: '' });

    expect(accessToken).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      'Missing required fields for requesting OAuth Password Grant access token'
    );
    expect(requestOAuthPasswordToken as jest.Mock).not.toHaveBeenCalled();
  });

  test('returns null and logs a warning if password is missing', async () => {
    const accessToken = await getOAuthPasswordAccessToken({ ...opts, password: '' });

    expect(accessToken).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      'Missing required fields for requesting OAuth Password Grant access token'
    );
    expect(requestOAuthPasswordToken as jest.Mock).not.toHaveBeenCalled();
  });

  test('throws if requestOAuthPasswordToken throws', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (requestOAuthPasswordToken as jest.Mock).mockRejectedValueOnce(
      new Error('requestOAuthPasswordToken error!!')
    );

    await expect(getOAuthPasswordAccessToken(opts)).rejects.toThrowErrorMatchingInlineSnapshot(
      `"requestOAuthPasswordToken error!!"`
    );
  });

  test('logs a warning if connectorTokenClient.updateOrReplace throws', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: null,
    });
    (requestOAuthPasswordToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'Bearer',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });
    connectorTokenClient.updateOrReplace.mockRejectedValueOnce(new Error('updateOrReplace error'));

    const accessToken = await getOAuthPasswordAccessToken(opts);

    expect(accessToken).toEqual('Bearer brandnewaccesstoken');
    expect(logger.warn).toHaveBeenCalledWith(
      'Not able to update connector token for connectorId: 123 due to error: updateOrReplace error'
    );
  });

  test('gets a fresh access token if connectorId is not provided', async () => {
    (requestOAuthPasswordToken as jest.Mock).mockResolvedValueOnce({
      tokenType: 'Bearer',
      accessToken: 'brandnewaccesstoken',
      expiresIn: 1000,
    });

    const { connectorId, ...optsWithoutConnectorId } = opts;

    const accessToken = await getOAuthPasswordAccessToken(optsWithoutConnectorId);

    expect(connectorTokenClient.get).not.toHaveBeenCalled();
    expect(connectorTokenClient.updateOrReplace).not.toHaveBeenCalled();
    expect(accessToken).toEqual('Bearer brandnewaccesstoken');
  });
});
