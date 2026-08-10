/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('./axios_utils', () => ({ request: jest.fn() }));

import type { Logger } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { actionsConfigMock } from '../actions_config.mock';
import { request } from './axios_utils';
import { requestVaultAppRoleLogin } from './request_vault_approle_login';

const mockRequest = request as jest.Mock;

const logger = loggingSystemMock.create().get() as jest.Mocked<Logger>;
const configurationUtilities = actionsConfigMock.create();

const CANARY = 'CANARY-9f3e2ab1-do-not-log';

const baseOpts = {
  address: 'https://vault.example.com:8200',
  mountPath: 'approle',
  roleId: 'the-role-id',
  secretId: 'the-secret-id',
  logger,
  configurationUtilities,
};

describe('requestVaultAppRoleLogin', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('POSTs role_id/secret_id to the mount-path login URL and returns the parsed token', async () => {
    mockRequest.mockResolvedValueOnce({
      data: { auth: { client_token: 's.abc123', lease_duration: 3600 } },
    });

    const result = await requestVaultAppRoleLogin(baseOpts);

    expect(result).toEqual({ clientToken: 's.abc123', leaseDurationSec: 3600 });
    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://vault.example.com:8200/v1/auth/approle/login',
        method: 'post',
        data: { role_id: 'the-role-id', secret_id: 'the-secret-id' },
        headers: undefined,
        configurationUtilities,
      })
    );
  });

  it('sends the X-Vault-Namespace header when namespace is set', async () => {
    mockRequest.mockResolvedValueOnce({
      data: { auth: { client_token: 's.abc123', lease_duration: 3600 } },
    });

    await requestVaultAppRoleLogin({ ...baseOpts, namespace: 'team-a' });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({ headers: { 'X-Vault-Namespace': 'team-a' } })
    );
  });

  it('builds the login URL from a non-default mount path', async () => {
    mockRequest.mockResolvedValueOnce({
      data: { auth: { client_token: 's.abc123', lease_duration: 3600 } },
    });

    await requestVaultAppRoleLogin({ ...baseOpts, mountPath: 'custom-approle-mount' });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://vault.example.com:8200/v1/auth/custom-approle-mount/login',
      })
    );
  });

  it('percent-encodes and validates the mount path via the shared Vault path utils', async () => {
    mockRequest.mockResolvedValueOnce({
      data: { auth: { client_token: 's.abc123', lease_duration: 3600 } },
    });

    await requestVaultAppRoleLogin({ ...baseOpts, mountPath: 'my mount' });

    expect(mockRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'https://vault.example.com:8200/v1/auth/my%20mount/login',
      })
    );
  });

  it('rejects a mount path with a path-traversal segment before making any request', async () => {
    await expect(
      requestVaultAppRoleLogin({ ...baseOpts, mountPath: '../other-mount' })
    ).rejects.toThrow(/mountPath/);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('rejects a non-https address before making any request', async () => {
    await expect(
      requestVaultAppRoleLogin({ ...baseOpts, address: 'http://vault.example.com' })
    ).rejects.toThrow(/https/);
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it('throws a name-only error and never leaks a canary embedded in a failure response', async () => {
    const err = Object.assign(new Error('Forbidden'), {
      response: { status: 403, data: { errors: [`invalid role or secret id ${CANARY}`] } },
    });
    mockRequest.mockRejectedValueOnce(err);

    await expect(requestVaultAppRoleLogin(baseOpts)).rejects.toThrow(/HTTP 403/);

    mockRequest.mockRejectedValueOnce(err);
    try {
      await requestVaultAppRoleLogin(baseOpts);
    } catch (error) {
      expect((error as Error).message).not.toContain(CANARY);
    }
  });

  it('throws a name-only error when the response is missing auth.client_token', async () => {
    mockRequest.mockResolvedValueOnce({ data: { auth: {} } });

    await expect(requestVaultAppRoleLogin(baseOpts)).rejects.toThrow(
      /missing or empty auth.client_token/
    );
  });

  it('defaults leaseDurationSec to 0 when lease_duration is not a number', async () => {
    mockRequest.mockResolvedValueOnce({ data: { auth: { client_token: 's.abc123' } } });

    const result = await requestVaultAppRoleLogin(baseOpts);

    expect(result).toEqual({ clientToken: 's.abc123', leaseDurationSec: 0 });
  });
});
