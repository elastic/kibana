/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('../get_vault_approle_access_token');
jest.mock('../delete_token_axios_interceptor');

import type { AxiosInstance } from 'axios';
import type { GetTokenOpts, VaultAppRoleGetTokenOpts } from '@kbn/connector-specs';
import { loggerMock } from '@kbn/logging-mocks';
import { actionsConfigMock } from '../../actions_config.mock';
import { connectorTokenClientMock } from '../connector_token_client.mock';
import { getVaultAppRoleAccessToken } from '../get_vault_approle_access_token';
import { getDeleteTokenAxiosInterceptor } from '../delete_token_axios_interceptor';
import { VaultAppRoleStrategy } from './vault_approle_strategy';
import type { AuthStrategyDeps } from './types';

const mockGetVaultAppRoleAccessToken = getVaultAppRoleAccessToken as jest.MockedFunction<
  typeof getVaultAppRoleAccessToken
>;
const mockGetDeleteTokenAxiosInterceptor = getDeleteTokenAxiosInterceptor as jest.MockedFunction<
  typeof getDeleteTokenAxiosInterceptor
>;

const logger = loggerMock.create();
const configurationUtilities = actionsConfigMock.create();
const connectorTokenClient = connectorTokenClientMock.create();

const baseDeps: AuthStrategyDeps = {
  connectorId: 'connector-1',
  secrets: {
    address: 'https://vault.example.com:8200',
    roleId: 'my-role-id',
    secretId: 'my-secret-id',
    mountPath: 'approle',
  },
  connectorTokenClient,
  logger,
  configurationUtilities,
};

const createMockAxiosInstance = () =>
  ({
    interceptors: { response: { use: jest.fn() } },
  } as unknown as AxiosInstance);

describe('VaultAppRoleStrategy', () => {
  let strategy: VaultAppRoleStrategy;

  const mockOnFulfilled = jest.fn();
  const mockOnRejected = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new VaultAppRoleStrategy();
    mockGetDeleteTokenAxiosInterceptor.mockReturnValue({
      onFulfilled: mockOnFulfilled,
      onRejected: mockOnRejected,
    });
  });

  describe('installResponseInterceptor', () => {
    it('installs the delete-token cleanup interceptor', () => {
      const instance = createMockAxiosInstance();
      strategy.installResponseInterceptor(instance, baseDeps);

      expect(mockGetDeleteTokenAxiosInterceptor).toHaveBeenCalledWith({
        connectorTokenClient,
        connectorId: 'connector-1',
      });
      expect(instance.interceptors.response.use).toHaveBeenCalledWith(
        mockOnFulfilled,
        mockOnRejected
      );
    });

    it('throws when connectorTokenClient is missing', () => {
      const instance = createMockAxiosInstance();
      expect(() =>
        strategy.installResponseInterceptor(instance, {
          ...baseDeps,
          connectorTokenClient: undefined,
        })
      ).toThrow(/missing required ConnectorTokenClient/);
    });
  });

  describe('getToken', () => {
    it('throws when opts authType is not vault_approle', async () => {
      const opts: GetTokenOpts = { authType: 'ears', provider: 'google' };
      await expect(strategy.getToken(opts, baseDeps)).rejects.toThrow(
        'VaultAppRoleStrategy received non-vault_approle token opts'
      );
    });

    it('delegates to getVaultAppRoleAccessToken with correct args', async () => {
      mockGetVaultAppRoleAccessToken.mockResolvedValue('s.somevaulttoken');

      const opts: VaultAppRoleGetTokenOpts = {
        authType: 'vault_approle',
        address: 'https://vault.example.com:8200',
        namespace: 'team-a',
        mountPath: 'approle',
        roleId: 'the-role-id',
        secretId: 'the-secret-id',
      };
      const result = await strategy.getToken(opts, baseDeps);

      expect(result).toBe('s.somevaulttoken');
      expect(mockGetVaultAppRoleAccessToken).toHaveBeenCalledWith({
        connectorId: 'connector-1',
        address: 'https://vault.example.com:8200',
        namespace: 'team-a',
        mountPath: 'approle',
        roleId: 'the-role-id',
        secretId: 'the-secret-id',
        logger,
        configurationUtilities,
        connectorTokenClient,
      });
    });
  });
});
