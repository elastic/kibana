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
import { getVaultAppRoleAccessToken } from './get_vault_approle_access_token';
import { requestVaultAppRoleLogin } from './request_vault_approle_login';

jest.mock('./request_vault_approle_login', () => ({
  requestVaultAppRoleLogin: jest.fn(),
}));

const mockRequestVaultAppRoleLogin = requestVaultAppRoleLogin as jest.Mock;

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

const CANARY = 'CANARY-9f3e2ab1-do-not-log';

let clock: sinon.SinonFakeTimers;

describe('getVaultAppRoleAccessToken', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
  });
  beforeEach(() => clock.reset());
  afterAll(() => clock.restore());

  const baseOpts = {
    connectorId: '123',
    address: 'https://vault.example.com:8200',
    mountPath: 'approle',
    roleId: 'role-id',
    secretId: 'secret-id',
    logger,
    configurationUtilities,
    connectorTokenClient,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses stored access token if it exists and is unexpired', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({
      hasErrors: false,
      connectorToken: {
        id: '1',
        connectorId: '123',
        tokenType: 'access_token',
        token: 'cached-vault-token',
        createdAt: new Date('2021-01-01T08:00:00.000Z').toISOString(),
        expiresAt: new Date('2021-01-02T13:00:00.000Z').toISOString(),
      },
    });

    const accessToken = await getVaultAppRoleAccessToken(baseOpts);

    expect(accessToken).toEqual('cached-vault-token');
    expect(mockRequestVaultAppRoleLogin).not.toHaveBeenCalled();
  });

  it('logs in and caches a new token when no token is stored', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({ hasErrors: false, connectorToken: null });
    mockRequestVaultAppRoleLogin.mockResolvedValueOnce({
      clientToken: 'brand-new-vault-token',
      leaseDurationSec: 3600,
    });

    const accessToken = await getVaultAppRoleAccessToken(baseOpts);

    expect(accessToken).toEqual('brand-new-vault-token');
    expect(mockRequestVaultAppRoleLogin).toHaveBeenCalledWith({
      address: 'https://vault.example.com:8200',
      namespace: undefined,
      mountPath: 'approle',
      roleId: 'role-id',
      secretId: 'secret-id',
      logger,
      configurationUtilities,
    });
    expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledWith({
      connectorId: '123',
      token: null,
      newToken: 'brand-new-vault-token',
      tokenRequestDate: Date.now(),
      expiresInSec: 3600,
      deleteExisting: false,
    });
  });

  it('re-logs in (no refresh_token concept) when the stored token is expired', async () => {
    const expired = {
      id: '1',
      connectorId: '123',
      tokenType: 'access_token',
      token: 'expired-token',
      createdAt: new Date('2021-01-01T08:00:00.000Z').toISOString(),
      expiresAt: new Date('2021-01-01T09:00:00.000Z').toISOString(),
    };
    connectorTokenClient.get.mockResolvedValueOnce({ hasErrors: false, connectorToken: expired });
    mockRequestVaultAppRoleLogin.mockResolvedValueOnce({
      clientToken: 'fresh-token',
      leaseDurationSec: 1800,
    });

    const accessToken = await getVaultAppRoleAccessToken(baseOpts);

    expect(accessToken).toEqual('fresh-token');
    expect(connectorTokenClient.updateOrReplace).toHaveBeenCalledWith(
      expect.objectContaining({ token: expired, newToken: 'fresh-token' })
    );
  });

  it('returns null and logs a warning when roleId is missing', async () => {
    const accessToken = await getVaultAppRoleAccessToken({ ...baseOpts, roleId: '' });

    expect(accessToken).toBeNull();
    expect(logger.warn).toHaveBeenCalledWith(
      'Missing required fields for requesting a Vault AppRole login token'
    );
    expect(mockRequestVaultAppRoleLogin).not.toHaveBeenCalled();
  });

  it('returns null and logs a warning when secretId is missing', async () => {
    const accessToken = await getVaultAppRoleAccessToken({ ...baseOpts, secretId: '' });

    expect(accessToken).toBeNull();
    expect(mockRequestVaultAppRoleLogin).not.toHaveBeenCalled();
  });

  it('logs a warning (but still returns the new token) if updateOrReplace throws', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({ hasErrors: false, connectorToken: null });
    mockRequestVaultAppRoleLogin.mockResolvedValueOnce({
      clientToken: 'brand-new-vault-token',
      leaseDurationSec: 3600,
    });
    connectorTokenClient.updateOrReplace.mockRejectedValueOnce(new Error('updateOrReplace error'));

    const accessToken = await getVaultAppRoleAccessToken(baseOpts);

    expect(accessToken).toEqual('brand-new-vault-token');
    expect(logger.warn).toHaveBeenCalledWith(
      'Not able to update connector token for connectorId: 123 due to error: updateOrReplace error'
    );
  });

  it('propagates a login failure without calling updateOrReplace', async () => {
    connectorTokenClient.get.mockResolvedValueOnce({ hasErrors: false, connectorToken: null });
    mockRequestVaultAppRoleLogin.mockRejectedValueOnce(new Error(`login failed: ${CANARY}`));

    await expect(getVaultAppRoleAccessToken(baseOpts)).rejects.toThrow(/login failed/);
    expect(connectorTokenClient.updateOrReplace).not.toHaveBeenCalled();
  });

  it('works without a connectorId/connectorTokenClient (always logs in fresh)', async () => {
    mockRequestVaultAppRoleLogin.mockResolvedValueOnce({
      clientToken: 'fresh-token-no-cache',
      leaseDurationSec: 900,
    });

    const accessToken = await getVaultAppRoleAccessToken({
      address: 'https://vault.example.com:8200',
      mountPath: 'approle',
      roleId: 'role-id',
      secretId: 'secret-id',
      logger,
      configurationUtilities,
    });

    expect(accessToken).toEqual('fresh-token-no-cache');
    expect(connectorTokenClient.get).not.toHaveBeenCalled();
    expect(connectorTokenClient.updateOrReplace).not.toHaveBeenCalled();
  });
});
