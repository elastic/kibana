/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import type { CheckPrivileges, CheckPrivilegesResponse } from '@kbn/security-plugin-types-server';

import type { ServiceAccountCredentialStore } from './credentials';
import { EsServiceAccounts } from './es_service_accounts';
import { licenseMock } from '../../common/licensing/index.mock';

const ACCOUNT_PATH = '/_security/service/kibana/nightshift-relay';
const TOKEN_PATH = `${ACCOUNT_PATH}/credential/token/kibana-managed`;

const clusterPrivilegesResponse = (authorized: boolean) =>
  ({
    hasAllRequested: authorized,
    privileges: { elasticsearch: { cluster: [{ privilege: 'manage_security', authorized }] } },
  } as unknown as CheckPrivilegesResponse);

/** The shape Elasticsearch returns for a scoped GET of a user-managed account. */
const accountEntry = (overrides = {}) => ({
  'kibana/nightshift-relay': {
    type: 'user_managed',
    roles: ['superuser'],
    enabled: true,
    ...overrides,
  },
});

describe('EsServiceAccounts', () => {
  const createParams = { name: 'nightshift-relay' };

  let serviceAccounts: EsServiceAccounts;
  let esClient: ReturnType<typeof elasticsearchServiceMock.createScopedClusterClient>;
  let clusterClient: ReturnType<typeof elasticsearchServiceMock.createClusterClient>;
  let credentialStore: jest.Mocked<ServiceAccountCredentialStore>;
  let license: ReturnType<typeof licenseMock.create>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let request: KibanaRequest;
  let getCurrentUser: jest.Mock;
  let mockCheckPrivileges: jest.Mocked<CheckPrivileges>;

  /** Queues the transport responses for the happy path: pre-flight miss, PUT, token, read-back. */
  const mockHappyPath = () => {
    esClient.asCurrentUser.transport.request
      .mockResolvedValueOnce({}) // pre-flight GET: no such account
      .mockResolvedValueOnce({ created: true }) // PUT
      .mockResolvedValueOnce({ created: true, token: { value: 'AAEAAWtpYmFuYS9...' } })
      .mockResolvedValueOnce(accountEntry()); // read-back
  };

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    license = licenseMock.create();
    license.isEnabled.mockReturnValue(true);

    esClient = elasticsearchServiceMock.createScopedClusterClient();
    clusterClient = elasticsearchServiceMock.createClusterClient();
    clusterClient.asScoped.mockReturnValue(esClient);

    credentialStore = {
      set: jest.fn().mockResolvedValue(undefined),
      delete: jest.fn().mockResolvedValue(true),
      getDecrypted: jest.fn().mockResolvedValue(null),
    } as unknown as jest.Mocked<ServiceAccountCredentialStore>;

    mockCheckPrivileges = { globally: jest.fn() } as unknown as jest.Mocked<CheckPrivileges>;
    mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(true));

    request = httpServerMock.createKibanaRequest();
    getCurrentUser = jest.fn().mockReturnValue(mockAuthenticatedUser({ roles: ['superuser'] }));

    serviceAccounts = new EsServiceAccounts({
      logger,
      license,
      clusterClient,
      checkPrivilegesWithRequest: jest.fn().mockReturnValue(mockCheckPrivileges),
      credentialStore,
      canEncrypt: true,
      getCurrentUser,
      getCurrentProfileId: jest.fn().mockResolvedValue(null),
    });
  });

  describe('#create', () => {
    it('creates the account, mints its token and stores the credential', async () => {
      mockHappyPath();

      await expect(serviceAccounts.create(request, createParams)).resolves.toEqual({
        id: 'kibana/nightshift-relay',
        name: 'nightshift-relay',
      });

      const calls = esClient.asCurrentUser.transport.request.mock.calls;
      expect(calls[0][0]).toEqual({ method: 'GET', path: ACCOUNT_PATH });
      expect(calls[1][0]).toEqual({
        method: 'PUT',
        path: ACCOUNT_PATH,
        body: { roles: ['superuser'] },
        querystring: { refresh: 'wait_for' },
      });
      expect(calls[2][0]).toEqual({ method: 'POST', path: TOKEN_PATH });

      expect(credentialStore.set).toHaveBeenCalledWith(
        expect.objectContaining({
          serviceAccountId: 'kibana/nightshift-relay',
          namespace: 'kibana',
          name: 'nightshift-relay',
          tokenName: 'kibana-managed',
          token: 'AAEAAWtpYmFuYS9...',
        })
      );
    });

    it('never reports the token to the caller', async () => {
      mockHappyPath();

      const created = await serviceAccounts.create(request, createParams);

      expect(Object.keys(created).sort()).toEqual(['id', 'name']);
      expect(JSON.stringify(created)).not.toContain('AAEAAW');
    });

    it('assigns explicitly requested roles instead of the creator’s', async () => {
      mockHappyPath();

      await serviceAccounts.create(request, { ...createParams, roles: ['viewer', 'editor'] });

      expect(esClient.asCurrentUser.transport.request.mock.calls[1][0]).toEqual(
        expect.objectContaining({ body: { roles: ['viewer', 'editor'] } })
      );
    });

    it('falls back to `superuser` and warns when roles cannot be derived', async () => {
      // Elasticsearch reports no roles at all for an API key, and the key's `limited_by` names
      // its owner's roles regardless of the key's own restriction, so nothing can be inferred.
      getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({
          authentication_type: 'api_key',
          roles: [],
          api_key: { id: 'key-id', name: 'key-name', managed_by: 'elasticsearch' },
        })
      );
      mockHappyPath();

      await expect(serviceAccounts.create(request, createParams)).resolves.toEqual({
        id: 'kibana/nightshift-relay',
        name: 'nightshift-relay',
      });

      expect(esClient.asCurrentUser.transport.request.mock.calls[1][0]).toEqual(
        expect.objectContaining({ body: { roles: ['superuser'] } })
      );
      // The widest possible grant must never be silent.
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('was granted [superuser]'));
    });

    it('does not warn when the roles came from the caller', async () => {
      mockHappyPath();

      await serviceAccounts.create(request, { ...createParams, roles: ['viewer'] });

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('does not warn when the roles were copied from the creator', async () => {
      mockHappyPath();

      await serviceAccounts.create(request, createParams);

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('accepts an API-key caller that names the roles explicitly', async () => {
      getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({
          authentication_type: 'api_key',
          roles: [],
          api_key: { id: 'key-id', name: 'key-name', managed_by: 'elasticsearch' },
        })
      );
      mockHappyPath();

      await expect(
        serviceAccounts.create(request, { ...createParams, roles: ['viewer'] })
      ).resolves.toEqual({ id: 'kibana/nightshift-relay', name: 'nightshift-relay' });
    });

    it('rejects with a 409 when the name is taken, without writing anything', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(accountEntry());

      await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
        output: { statusCode: 409 },
      });

      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(1);
      expect(credentialStore.set).not.toHaveBeenCalled();
    });

    it('treats a built-in account at the same principal as absent', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({
          'kibana/nightshift-relay': { type: 'built_in', role_descriptor: {} },
        })
        .mockResolvedValueOnce({ created: true })
        .mockResolvedValueOnce({ created: true, token: { value: 'token' } })
        .mockResolvedValueOnce(accountEntry());

      await expect(serviceAccounts.create(request, createParams)).resolves.toEqual({
        id: 'kibana/nightshift-relay',
        name: 'nightshift-relay',
      });
    });

    it('rejects with a 403 when security features are disabled', async () => {
      license.isEnabled.mockReturnValue(false);

      await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects with a 424 when saved object encryption is unavailable', async () => {
      serviceAccounts = new EsServiceAccounts({
        logger,
        license,
        clusterClient,
        checkPrivilegesWithRequest: jest.fn().mockReturnValue(mockCheckPrivileges),
        credentialStore,
        canEncrypt: false,
        getCurrentUser,
        getCurrentProfileId: jest.fn().mockResolvedValue(null),
      });

      await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
        output: { statusCode: 424 },
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects with a 403 when the caller lacks the `manage_security` cluster privilege', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects a name that could escape the Elasticsearch path', async () => {
      await expect(
        serviceAccounts.create(request, { name: '../_cluster/settings' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rolls back the token and the account when the credential cannot be stored', async () => {
      mockHappyPath();
      credentialStore.set.mockRejectedValue(new Error('encryption key rotated'));

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow(
        'encryption key rotated'
      );

      const calls = esClient.asCurrentUser.transport.request.mock.calls;
      expect(calls[3][0]).toEqual({ method: 'DELETE', path: TOKEN_PATH });
      expect(calls[4][0]).toEqual({
        method: 'DELETE',
        path: ACCOUNT_PATH,
        querystring: { force: 'true' },
      });
    });

    it('surfaces the original failure even when the rollback itself fails', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ created: true })
        .mockResolvedValueOnce({ created: true, token: { value: 'token' } })
        .mockRejectedValue(new Error('cluster unreachable'));
      credentialStore.set.mockRejectedValue(new Error('encryption key rotated'));

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow(
        'encryption key rotated'
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to roll back partially created service account')
      );
    });

    it('logs and rethrows an Elasticsearch failure on the account write', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('illegal_argument_exception'));

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow(
        'illegal_argument_exception'
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create service account')
      );
      expect(credentialStore.set).not.toHaveBeenCalled();
    });

    it('rejects with a 500 when the account cannot be read back', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ created: true })
        .mockResolvedValueOnce({ created: true, token: { value: 'token' } })
        .mockResolvedValueOnce({});

      await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
        output: { statusCode: 500 },
      });
    });
  });

  describe('#createFakeRequest', () => {
    it('rejects with a 501 so callers surface a clear "not implemented" response', async () => {
      await expect(serviceAccounts.createFakeRequest()).rejects.toMatchObject({
        message: 'Creating requests for Elasticsearch service accounts is not yet implemented',
        output: { statusCode: 501 },
      });
    });
  });

  describe('#reauthenticateFakeRequest', () => {
    it('resolves to null so unrelated fake requests stay on the not-handled path', async () => {
      await expect(serviceAccounts.reauthenticateFakeRequest()).resolves.toBeNull();
    });
  });

  describe('#releaseFakeRequest', () => {
    it('is a no-op since this backend never mints requests', () => {
      expect(() => serviceAccounts.releaseFakeRequest()).not.toThrow();
    });
  });
});
