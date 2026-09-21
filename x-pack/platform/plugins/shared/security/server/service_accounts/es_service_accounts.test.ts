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
import {
  ES_SERVICE_ACCOUNT_TOKEN_MAX_LENGTH,
  SERVICE_ACCOUNT_MAX_ROLES,
} from '../../common/service_accounts';
import { securityTelemetry } from '../otel/instrumentation';

jest.mock('../otel/instrumentation', () => ({
  securityTelemetry: {
    recordServiceAccountCreationAttempt: jest.fn(),
    recordServiceAccountRollbackFailure: jest.fn(),
  },
}));

const ACCOUNT_PATH = '/_security/service/kibana/nightshift-relay';
/** Kibana only ever manages user-managed accounts, so the GET asks for that type explicitly. */
const READ_ACCOUNT = { method: 'GET', path: ACCOUNT_PATH, querystring: { type: 'user_managed' } };
const CREDENTIALS_PATH = `${ACCOUNT_PATH}/credential`;
const TOKEN_PATH = `${CREDENTIALS_PATH}/token/kibana-managed`;
/** The shape Elasticsearch returns for a GET of an account's credentials. */
const accountCredentials = (tokenNames: string[] = []) => ({
  tokens: Object.fromEntries(tokenNames.map((tokenName) => [tokenName, {}])),
});

const clusterPrivilegesResponse = (authorized: boolean) =>
  ({
    hasAllRequested: authorized,
    privileges: { elasticsearch: { cluster: [{ privilege: 'manage_security', authorized }] } },
  } as unknown as CheckPrivilegesResponse);

/** A credential document left behind by an account that is no longer there. */
const staleCredential = () => ({
  serviceAccountId: 'kibana/nightshift-relay',
  namespace: 'kibana',
  name: 'nightshift-relay',
  tokenName: 'kibana-managed',
  createdAt: '2026-09-21T00:00:00.000Z',
  createdBy: { type: 'user' as const, username: 'user' },
  token: 'AAEAAWtpYmFuYS9...',
});

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
  let getCurrentUserProfileId: jest.Mock;
  let userProfiles: { bulkGet: jest.Mock };
  let mockCheckPrivileges: jest.Mocked<CheckPrivileges>;

  /** Queues the transport responses for the happy path: pre-flight miss, PUT, token. */
  const mockHappyPath = () => {
    esClient.asCurrentUser.transport.request
      .mockResolvedValueOnce({}) // pre-flight GET: no such account
      .mockResolvedValueOnce({ created: true }) // PUT
      .mockResolvedValueOnce({ created: true, token: { value: 'AAEAAWtpYmFuYS9...' } });
  };

  beforeEach(() => {
    jest.clearAllMocks();
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
      getMetadata: jest.fn().mockResolvedValue(new Map()),
    } as unknown as jest.Mocked<ServiceAccountCredentialStore>;

    mockCheckPrivileges = { globally: jest.fn() } as unknown as jest.Mocked<CheckPrivileges>;
    mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(true));

    request = httpServerMock.createKibanaRequest();
    getCurrentUser = jest.fn().mockReturnValue(mockAuthenticatedUser({ roles: ['superuser'] }));
    getCurrentUserProfileId = jest.fn().mockResolvedValue(null);
    userProfiles = { bulkGet: jest.fn().mockResolvedValue([]) };

    serviceAccounts = new EsServiceAccounts({
      logger,
      license,
      clusterClient,
      checkPrivilegesWithRequest: jest.fn().mockReturnValue(mockCheckPrivileges),
      credentialStore,
      canEncrypt: true,
      getCurrentUser,
      getCurrentUserProfileId,
      userProfiles,
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
      expect(calls[0][0]).toEqual(READ_ACCOUNT);
      expect(calls[1][0]).toEqual({
        method: 'PUT',
        path: ACCOUNT_PATH,
        body: { roles: ['superuser'] },
        querystring: { refresh: 'wait_for' },
      });
      expect(calls[2][0]).toEqual({ method: 'POST', path: TOKEN_PATH });
      // No read-back: the principal and the name are the ones just written, so a completed
      // creation has no remaining way to fail.
      expect(calls).toHaveLength(3);

      expect(securityTelemetry.recordServiceAccountCreationAttempt).toHaveBeenCalledWith({
        outcome: 'success',
        serviceAccountBackend: 'stack',
      });

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

    // Elasticsearch caps no role count of its own, so a creator can hold more roles than Kibana
    // is willing to read back. Copying them would create an account `readAccount` then refuses.
    it('rejects a creator whose roles fall outside what an explicit `roles` may hold', async () => {
      getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({
          roles: new Array(SERVICE_ACCOUNT_MAX_ROLES + 1).fill('viewer'),
        })
      );

      await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('Specify `roles` explicitly'),
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
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

    // A third account type, a renamed field, or a role list outside Kibana's caps would
    // otherwise read as "the name is free", and the PUT that follows is a full replacement.
    it('refuses rather than overwriting an account it cannot read', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        'kibana/nightshift-relay': { type: 'user_managed', roles: 'superuser', enabled: true },
      });

      await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
        output: { statusCode: 502 },
      });

      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(1);
      expect(credentialStore.set).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('in an unrecognized shape')
      );
    });

    it('treats a built-in account at the same principal as absent', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({
          'kibana/nightshift-relay': { type: 'built_in', role_descriptor: {} },
        })
        .mockResolvedValueOnce({ created: true })
        .mockResolvedValueOnce({ created: true, token: { value: 'token' } });

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
        getCurrentUserProfileId: jest.fn().mockResolvedValue(null),
        userProfiles,
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

    // An explicit empty list means "no roles", which is not the same question as "work them out
    // for me". Answering it with the widest possible grant would be the worst reading of it.
    it('rejects an empty `roles` rather than falling back to `superuser`', async () => {
      await expect(
        serviceAccounts.create(request, { ...createParams, roles: [] })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });

      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('refuses a token longer than Elasticsearch should ever report, and rolls back', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockResolvedValueOnce({ created: true })
        .mockResolvedValueOnce({
          token: { value: 'a'.repeat(ES_SERVICE_ACCOUNT_TOKEN_MAX_LENGTH + 1) },
        });

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow();

      expect(credentialStore.set).not.toHaveBeenCalled();
      const calls = esClient.asCurrentUser.transport.request.mock.calls;
      expect(calls[3][0]).toEqual({ method: 'DELETE', path: TOKEN_PATH });
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
      // A rejected `set` does not prove Elasticsearch never committed the document.
      expect(credentialStore.delete).toHaveBeenCalledWith('kibana/nightshift-relay');
    });

    it('still rolls back Elasticsearch when the credential delete fails', async () => {
      mockHappyPath();
      credentialStore.set.mockRejectedValue(new Error('encryption key rotated'));
      credentialStore.delete.mockRejectedValue(new Error('saved objects index read-only'));

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
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(
          'Failed to delete the credential of partially created service account'
        )
      );
      expect(securityTelemetry.recordServiceAccountRollbackFailure).toHaveBeenCalledWith({
        serviceAccountRollbackResource: 'credential',
      });
    });

    // The forced account delete exists for exactly this case: Elasticsearch refuses an unforced
    // delete while a token remains, so a token Kibana could not delete must not also stop the
    // account from going away.
    it('still deletes the account when the token delete fails', async () => {
      mockHappyPath();
      esClient.asCurrentUser.transport.request.mockRejectedValueOnce(
        new Error('cluster unreachable')
      );
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
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete the token of partially created service account')
      );
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

      // Both deletes were attempted, and neither failure replaced the error the caller needs.
      const calls = esClient.asCurrentUser.transport.request.mock.calls;
      expect(calls[4][0]).toEqual({
        method: 'DELETE',
        path: ACCOUNT_PATH,
        querystring: { force: 'true' },
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to roll back partially created service account')
      );
      // The account may still be alive, and this credential is the only record of the token it
      // holds, so it outlives a rollback that could not remove the account.
      expect(credentialStore.delete).not.toHaveBeenCalled();

      // Counted separately, since one rollback can strand more than one resource.
      expect(securityTelemetry.recordServiceAccountRollbackFailure).toHaveBeenCalledWith({
        serviceAccountRollbackResource: 'token',
      });
      expect(securityTelemetry.recordServiceAccountRollbackFailure).toHaveBeenCalledWith({
        serviceAccountRollbackResource: 'account',
      });
      expect(securityTelemetry.recordServiceAccountCreationAttempt).toHaveBeenCalledWith({
        outcome: 'failure',
        serviceAccountBackend: 'stack',
      });
    });

    // Attribution is worth an extra lookup, but never worth throwing away an account
    // Elasticsearch already created. The lookup reaches Elasticsearch on most of its paths.
    it('creates the account even when the user profile lookup rejects', async () => {
      mockHappyPath();
      getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({ roles: ['superuser'], profile_uid: undefined })
      );
      getCurrentUserProfileId.mockRejectedValue(new Error('profile index unavailable'));

      await expect(serviceAccounts.create(request, createParams)).resolves.toEqual({
        id: 'kibana/nightshift-relay',
        name: 'nightshift-relay',
      });

      // Recorded without the profile id rather than not recorded at all.
      expect(credentialStore.set).toHaveBeenCalledWith(
        expect.objectContaining({
          createdBy: { type: 'user', username: 'user' },
        })
      );
      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(3);
    });

    it('logs and rethrows an Elasticsearch failure on the account write', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('illegal_argument_exception'))
        .mockResolvedValueOnce({}); // reconciliation read-back: nothing was committed

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow(
        'illegal_argument_exception'
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to create service account [kibana/nightshift-relay]')
      );
      expect(credentialStore.set).not.toHaveBeenCalled();
    });

    // A rejected PUT does not prove Elasticsearch never committed it. Without the read-back the
    // account would survive with no token and no credential, and the pre-flight check would then
    // refuse that name on every retry.
    it('removes the account when an ambiguous account write turns out to have committed', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('socket hang up'))
        .mockResolvedValueOnce(accountEntry())
        .mockResolvedValueOnce(accountCredentials()) // no token, so the account is this call's
        .mockResolvedValue({});

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow('socket hang up');

      const calls = esClient.asCurrentUser.transport.request.mock.calls;
      expect(calls[2][0]).toEqual(READ_ACCOUNT);
      expect(calls[3][0]).toEqual({ method: 'GET', path: CREDENTIALS_PATH });
      expect(calls[4][0]).toEqual({ method: 'DELETE', path: TOKEN_PATH });
      expect(calls[5][0]).toEqual({
        method: 'DELETE',
        path: ACCOUNT_PATH,
        querystring: { force: 'true' },
      });
      expect(credentialStore.set).not.toHaveBeenCalled();
    });

    // The one case that makes the token the discriminator rather than the stored credential: a
    // credential can outlive its account, and reading that leftover as ownership would strand
    // the account this call just wrote.
    it('removes the account when a credential is stored but the account holds no token', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('socket hang up'))
        .mockResolvedValueOnce(accountEntry())
        .mockResolvedValueOnce(accountCredentials())
        .mockResolvedValue({});
      credentialStore.getDecrypted.mockResolvedValue(staleCredential());

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow('socket hang up');

      const calls = esClient.asCurrentUser.transport.request.mock.calls;
      expect(calls[5][0]).toEqual({
        method: 'DELETE',
        path: ACCOUNT_PATH,
        querystring: { force: 'true' },
      });
      // The leftover goes with it: its token belonged to an account that is gone.
      expect(credentialStore.delete).toHaveBeenCalledWith('kibana/nightshift-relay');
    });

    it('deletes nothing when the failed account write never committed', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('socket hang up'))
        .mockResolvedValueOnce({});

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow('socket hang up');

      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(3);
      expect(credentialStore.delete).not.toHaveBeenCalled();
    });

    // This call failed before minting anything, so a token on the account means a concurrent
    // create put it there. That account is not this call's to remove.
    it('leaves the account alone when it already holds the managed token', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('socket hang up'))
        .mockResolvedValueOnce(accountEntry())
        .mockResolvedValueOnce(accountCredentials(['kibana-managed']));

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow('socket hang up');

      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(4);
      expect(credentialStore.delete).not.toHaveBeenCalled();
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('it already holds a [kibana-managed] token')
      );
    });

    // A token an operator minted under another name says nothing about who owns the account.
    it('removes the account when its only token is not the one Kibana mints', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('socket hang up'))
        .mockResolvedValueOnce(accountEntry())
        .mockResolvedValueOnce(accountCredentials(['operator-token']))
        .mockResolvedValue({});

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow('socket hang up');

      const calls = esClient.asCurrentUser.transport.request.mock.calls;
      expect(calls[5][0]).toEqual({
        method: 'DELETE',
        path: ACCOUNT_PATH,
        querystring: { force: 'true' },
      });
    });

    it('surfaces the original failure when the reconciliation read itself fails', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('socket hang up'))
        .mockRejectedValueOnce(new Error('cluster unreachable'));

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow('socket hang up');

      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(3);
      expect(credentialStore.delete).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Could not determine whether the failed create')
      );
      expect(securityTelemetry.recordServiceAccountRollbackFailure).toHaveBeenCalledWith({
        serviceAccountRollbackResource: 'account',
      });
    });

    // The response is not validated, so this pins the behavior that keeps that safe: a shape
    // without `tokens` raises, and "I cannot tell" must not read as "no token". The alternative
    // is force-deleting an account a concurrent create owns.
    it('leaves the account alone when the token read comes back unreadable', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce({})
        .mockRejectedValueOnce(new Error('socket hang up'))
        .mockResolvedValueOnce(accountEntry())
        .mockResolvedValueOnce({ count: 1 }); // no `tokens`

      await expect(serviceAccounts.create(request, createParams)).rejects.toThrow('socket hang up');

      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(4);
      expect(credentialStore.delete).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Could not determine whether the failed create')
      );
    });
  });

  describe('#list', () => {
    const QUERY_PATH = '/_security/_query/service';
    /** One item as the query API reports it. */
    const queried = (username: string, overrides = {}) => ({
      username,
      type: 'user_managed',
      roles: ['viewer'],
      enabled: true,
      ...overrides,
    });
    const credential = (createdAt: string, userProfileId?: string) => ({
      createdAt,
      createdBy: {
        type: 'user' as const,
        username: 'elastic',
        ...(userProfileId ? { userProfileId } : {}),
      },
    });

    it('queries one page of user-managed accounts sorted by principal and joins the credentials', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        total: 2,
        count: 2,
        service_accounts: [
          queried('acme/billing', { enabled: false, roles: ['billing_read'] }),
          queried('kibana/nightshift-relay'),
        ],
      });
      credentialStore.getMetadata.mockResolvedValue(
        new Map([['kibana/nightshift-relay', credential('2026-09-21T00:00:00.000Z')]])
      );

      const result = await serviceAccounts.list(request);

      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['read_security'], index: {} },
      });
      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(1);
      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: QUERY_PATH,
        body: { size: 101, sort: ['username'] },
      });
      expect(credentialStore.getMetadata).toHaveBeenCalledWith([
        'acme/billing',
        'kibana/nightshift-relay',
      ]);
      expect(result).toEqual({
        serviceAccounts: [
          {
            id: 'acme/billing',
            name: 'billing',
            roles: ['billing_read'],
            enabled: false,
            hasCredential: false,
          },
          {
            id: 'kibana/nightshift-relay',
            name: 'nightshift-relay',
            roles: ['viewer'],
            enabled: true,
            hasCredential: true,
            createdAt: '2026-09-21T00:00:00.000Z',
            createdBy: { type: 'user', username: 'elastic' },
          },
        ],
      });
      expect(result).not.toHaveProperty('nextPage');
      // No creator carries a profile id, so the profile index is never consulted.
      expect(userProfiles.bulkGet).not.toHaveBeenCalled();
    });

    it('resolves the creator display name from the user profile', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        service_accounts: [queried('kibana/nightshift-relay')],
      });
      credentialStore.getMetadata.mockResolvedValue(
        new Map([
          ['kibana/nightshift-relay', credential('2026-09-21T00:00:00.000Z', 'profile-uid')],
        ])
      );
      userProfiles.bulkGet.mockResolvedValue([
        { uid: 'profile-uid', user: { username: 'elastic', full_name: 'Ada Lovelace' } },
      ]);

      const result = await serviceAccounts.list(request);

      expect(userProfiles.bulkGet).toHaveBeenCalledWith({ uids: new Set(['profile-uid']) });
      expect(result.serviceAccounts[0].createdBy).toEqual({
        type: 'user',
        username: 'elastic',
        userProfileId: 'profile-uid',
        displayName: 'Ada Lovelace',
      });
    });

    it('reports the page without names when the profile lookup fails', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        service_accounts: [queried('kibana/nightshift-relay')],
      });
      credentialStore.getMetadata.mockResolvedValue(
        new Map([
          ['kibana/nightshift-relay', credential('2026-09-21T00:00:00.000Z', 'profile-uid')],
        ])
      );
      userProfiles.bulkGet.mockRejectedValue(new Error('profile index unavailable'));

      const result = await serviceAccounts.list(request);

      // A directory read must not fail because the profile index is down.
      expect(result.serviceAccounts[0].createdBy).toEqual({
        type: 'user',
        username: 'elastic',
        userProfileId: 'profile-uid',
      });
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Could not resolve the creators of the listed service accounts')
      );
    });

    it('reports only the binder fields, dropping anything else the credential carries', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        service_accounts: [queried('kibana/nightshift-relay')],
      });
      credentialStore.getMetadata.mockResolvedValue(
        new Map([
          [
            'kibana/nightshift-relay',
            {
              createdAt: '2026-09-21T00:00:00.000Z',
              createdBy: {
                type: 'user' as const,
                username: 'elastic',
                token: 'AAEAAWtpYmFuYS9...',
              },
            },
          ],
        ])
      );

      const result = await serviceAccounts.list(request);

      expect(result.serviceAccounts[0].createdBy).toEqual({ type: 'user', username: 'elastic' });
    });

    it('asks for one more than the page and reports the last principal as the cursor when it arrives', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        total: 3,
        count: 3,
        service_accounts: [queried('kibana/a'), queried('kibana/b'), queried('kibana/c')],
      });

      const result = await serviceAccounts.list(request, { limit: 2 });

      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: QUERY_PATH,
        body: { size: 3, sort: ['username'] },
      });
      expect(result.serviceAccounts.map(({ id }) => id)).toEqual(['kibana/a', 'kibana/b']);
      expect(result.nextPage).toBe('kibana/b');
      // The extra row is never reported, so its credential is never looked up either.
      expect(credentialStore.getMetadata).toHaveBeenCalledWith(['kibana/a', 'kibana/b']);
    });

    it('resumes from the cursor with search_after', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        total: 3,
        count: 1,
        service_accounts: [queried('kibana/c')],
      });

      await serviceAccounts.list(request, { limit: 2, after: 'kibana/b' });

      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledWith({
        method: 'POST',
        path: QUERY_PATH,
        body: { size: 3, sort: ['username'], search_after: ['kibana/b'] },
      });
    });

    it('returns an empty page without consulting the credential store', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        total: 0,
        count: 0,
        service_accounts: [],
      });

      await expect(serviceAccounts.list(request)).resolves.toEqual({ serviceAccounts: [] });

      expect(credentialStore.getMetadata).toHaveBeenCalledWith([]);
    });

    it('rejects a cursor this backend could not have issued with a 400', async () => {
      await expect(
        serviceAccounts.list(request, { after: 'not-a-principal' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });

      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects with a 502 when the envelope itself is unrecognized', async () => {
      // A broken envelope is the one shape there is no page to salvage from, unlike a single
      // account Kibana cannot read.
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({ accounts: [] });

      await expect(serviceAccounts.list(request)).rejects.toMatchObject({
        output: { statusCode: 502 },
      });
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('unrecognized shape'));
    });

    it('skips an account it cannot read and still reports the rest of the page', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        service_accounts: [
          queried('no-namespace'),
          { username: 'kibana/no-roles', type: 'user_managed' },
          queried('kibana/nightshift-relay'),
        ],
      });

      const result = await serviceAccounts.list(request);

      // Two unreadable accounts cost those accounts, not the directory.
      expect(result.serviceAccounts.map(({ id }) => id)).toEqual(['kibana/nightshift-relay']);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping service account [no-namespace]')
      );
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining(
          'Skipping a service account Elasticsearch reported in an unrecognized shape'
        )
      );
      // The credential join only ever sees the accounts that survived.
      expect(credentialStore.getMetadata).toHaveBeenCalledWith(['kibana/nightshift-relay']);
    });

    it('takes the cursor from the raw page, so a skipped entry does not rewind paging', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        service_accounts: [
          queried('kibana/a'),
          // Unreadable, and the last account of the page: the cursor still has to step over it.
          { username: 'kibana/b', type: 'user_managed' },
          queried('kibana/c'),
        ],
      });

      const result = await serviceAccounts.list(request, { limit: 2 });

      expect(result.serviceAccounts.map(({ id }) => id)).toEqual(['kibana/a']);
      expect(result.nextPage).toBe('kibana/b');
    });

    it.each([
      ['no username at all', { type: 'user_managed' }],
      ['a username this backend would refuse back', queried('no-namespace')],
    ])('rejects with a 502 when the last account of the page has %s', async (_, lastAccount) => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        service_accounts: [queried('kibana/a'), lastAccount, queried('kibana/c')],
      });

      // Every cursor this backend hands out has to be one it will accept back, and silently
      // ending the directory here would hide every account after this one.
      await expect(serviceAccounts.list(request, { limit: 2 })).rejects.toMatchObject({
        output: { statusCode: 502 },
      });
    });

    it('hands out a cursor its own `after` guard accepts', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValue({
        service_accounts: [queried('kibana/a'), queried('kibana/b')],
      });

      const { nextPage } = await serviceAccounts.list(request, { limit: 1 });

      await expect(serviceAccounts.list(request, { limit: 1, after: nextPage })).resolves.toEqual(
        expect.objectContaining({ serviceAccounts: expect.any(Array) })
      );
    });

    it('rejects with a 403 when security features are disabled in Elasticsearch', async () => {
      license.isEnabled.mockReturnValue(false);

      await expect(serviceAccounts.list(request)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects with a 403 when the caller lacks the `read_security` cluster privilege', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(serviceAccounts.list(request)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rethrows Elasticsearch failures', async () => {
      esClient.asCurrentUser.transport.request.mockRejectedValueOnce(new Error('socket hang up'));

      await expect(serviceAccounts.list(request)).rejects.toThrow('socket hang up');
    });
  });

  describe('#get', () => {
    const ACCOUNT_ID = 'kibana/nightshift-relay';

    it('reads the user-managed account and joins its credential', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(
        accountEntry({ roles: ['viewer'] })
      );
      credentialStore.getMetadata.mockResolvedValue(
        new Map([
          [
            ACCOUNT_ID,
            {
              createdAt: '2026-09-21T00:00:00.000Z',
              createdBy: {
                type: 'user' as const,
                username: 'elastic',
                userProfileId: 'profile-uid',
              },
            },
          ],
        ])
      );
      userProfiles.bulkGet.mockResolvedValue([
        { uid: 'profile-uid', user: { username: 'elastic', full_name: 'Ada Lovelace' } },
      ]);

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).resolves.toEqual({
        id: ACCOUNT_ID,
        name: 'nightshift-relay',
        roles: ['viewer'],
        enabled: true,
        hasCredential: true,
        createdAt: '2026-09-21T00:00:00.000Z',
        createdBy: {
          type: 'user',
          username: 'elastic',
          userProfileId: 'profile-uid',
          displayName: 'Ada Lovelace',
        },
      });

      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['read_security'], index: {} },
      });
      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledWith(READ_ACCOUNT, {
        ignore: [404],
      });
      expect(credentialStore.getMetadata).toHaveBeenCalledWith([ACCOUNT_ID]);
    });

    it('reports an account Kibana holds no credential for', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(accountEntry());

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).resolves.toEqual({
        id: ACCOUNT_ID,
        name: 'nightshift-relay',
        roles: ['superuser'],
        enabled: true,
        hasCredential: false,
      });
    });

    it('rejects with a 404 when there is no such account', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({});

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
      expect(credentialStore.getMetadata).not.toHaveBeenCalled();
    });

    it('rejects with a 404 for a built-in account, which is not Kibana to list', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        'elastic/kibana': { type: 'built_in', role_descriptor: {} },
      });

      await expect(serviceAccounts.get(request, 'elastic/kibana')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('rejects an id that is not namespace/service with a 400 before reaching Elasticsearch', async () => {
      for (const id of ['nightshift-relay', 'kibana/../_cluster', 'a/b/c', '']) {
        await expect(serviceAccounts.get(request, id)).rejects.toMatchObject({
          output: { statusCode: 400 },
        });
      }
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects with a 502 when the account is reported in an unrecognized shape', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(
        accountEntry({ roles: 'viewer' })
      );

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 502 },
      });
    });

    it('rejects with a 403 when security features are disabled in Elasticsearch', async () => {
      license.isEnabled.mockReturnValue(false);

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects with a 403 when the caller lacks the `read_security` cluster privilege', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
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
