/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';

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
  SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH,
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
      findExisting: jest.fn().mockResolvedValue(new Set()),
    } as unknown as jest.Mocked<ServiceAccountCredentialStore>;

    mockCheckPrivileges = { globally: jest.fn() } as unknown as jest.Mocked<CheckPrivileges>;
    mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(true));

    request = httpServerMock.createKibanaRequest();
    getCurrentUser = jest.fn().mockReturnValue(mockAuthenticatedUser({ roles: ['superuser'] }));
    getCurrentUserProfileId = jest.fn().mockResolvedValue(null);

    serviceAccounts = new EsServiceAccounts({
      logger,
      license,
      clusterClient,
      checkPrivilegesWithRequest: jest.fn().mockReturnValue(mockCheckPrivileges),
      credentialStore,
      canEncrypt: true,
      getCurrentUser,
      getCurrentUserProfileId,
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
      request = httpServerMock.createKibanaRequest({
        headers: { authorization: 'ApiKey a2V5LWlkOnNlY3JldA==' },
      });
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
      expect(clusterClient.asScoped).toHaveBeenCalledWith(request);
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

    // A third account type or a renamed field would otherwise read as "the name is free", and
    // the PUT that follows is a full replacement.
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

    it('queries one page of user-managed accounts sorted by principal and joins the credentials', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        total: 2,
        count: 2,
        service_accounts: [
          queried('acme/billing', { enabled: false, roles: ['billing_read'] }),
          queried('kibana/nightshift-relay'),
        ],
      });
      credentialStore.findExisting.mockResolvedValue(new Set(['kibana/nightshift-relay']));

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
      expect(credentialStore.findExisting).toHaveBeenCalledWith([
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
            assumable: false,
          },
          {
            id: 'kibana/nightshift-relay',
            name: 'nightshift-relay',
            roles: ['viewer'],
            enabled: true,
            assumable: true,
          },
        ],
      });
      expect(result).not.toHaveProperty('nextPage');
    });

    it('reports no creator, which Elasticsearch does not record yet', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        service_accounts: [queried('kibana/nightshift-relay')],
      });
      // The credential names whoever asked Kibana to create the account. That is not the
      // account's creator, so it stays out of the entry until Elasticsearch reports one.
      credentialStore.findExisting.mockResolvedValue(new Set(['kibana/nightshift-relay']));

      const [entry] = (await serviceAccounts.list(request)).serviceAccounts;

      expect(entry).not.toHaveProperty('createdBy');
      expect(entry).not.toHaveProperty('createdAt');
      expect(entry.assumable).toBe(true);
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
      expect(credentialStore.findExisting).toHaveBeenCalledWith(['kibana/a', 'kibana/b']);
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

      expect(credentialStore.findExisting).toHaveBeenCalledWith([]);
    });

    it('skips an account whose principal it cannot split and still reports the rest of the page', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        service_accounts: [queried('no-namespace'), queried('kibana/nightshift-relay')],
      });

      const result = await serviceAccounts.list(request);

      // One unreadable account costs that account, not the directory.
      expect(result.serviceAccounts.map(({ id }) => id)).toEqual(['kibana/nightshift-relay']);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Skipping service account [no-namespace]')
      );
      // The credential join only ever sees the accounts that survived.
      expect(credentialStore.findExisting).toHaveBeenCalledWith(['kibana/nightshift-relay']);
    });

    it('takes the cursor from the raw page, so a skipped entry does not rewind paging', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        service_accounts: [
          queried('kibana/a'),
          // Unreadable, and the last account of the page: the cursor still has to step over it.
          queried('no-namespace'),
          queried('kibana/c'),
        ],
      });

      const result = await serviceAccounts.list(request, { limit: 2 });

      expect(result.serviceAccounts.map(({ id }) => id)).toEqual(['kibana/a']);
      expect(result.nextPage).toBe('no-namespace');
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

    it('reads the user-managed account and confirms it is assumable', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce(accountEntry({ roles: ['viewer'] }))
        // The account still holds Kibana's token, so the stored credential describes it.
        .mockResolvedValueOnce(accountCredentials(['kibana-managed']));
      credentialStore.findExisting.mockResolvedValue(new Set([ACCOUNT_ID]));

      // The credential records who asked Kibana to create the account, and none of it is
      // reported: Elasticsearch does not store a creator yet, and Kibana will not invent one.
      await expect(serviceAccounts.get(request, ACCOUNT_ID)).resolves.toEqual({
        id: ACCOUNT_ID,
        name: 'nightshift-relay',
        roles: ['viewer'],
        enabled: true,
        assumable: true,
      });

      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['read_security'], index: {} },
      });
      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledWith(READ_ACCOUNT, {
        ignore: [404],
      });
      expect(credentialStore.findExisting).toHaveBeenCalledWith([ACCOUNT_ID]);
    });

    it('reports an account Kibana cannot assume without asking for its tokens', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(accountEntry());

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).resolves.toEqual({
        id: ACCOUNT_ID,
        name: 'nightshift-relay',
        roles: ['superuser'],
        enabled: true,
        assumable: false,
      });

      // An account Kibana never created costs no extra round trip.
      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(1);
    });

    it("stops reporting assumable once the account no longer holds Kibana's token", async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce(accountEntry({ roles: ['viewer'] }))
        // Deleted and recreated through Elasticsearch: the account is back, Kibana's token is
        // not, and the credential document outlived both.
        .mockResolvedValueOnce(accountCredentials([]));
      credentialStore.findExisting.mockResolvedValue(new Set([ACCOUNT_ID]));

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).resolves.toEqual({
        id: ACCOUNT_ID,
        name: 'nightshift-relay',
        roles: ['viewer'],
        enabled: true,
        assumable: false,
      });
    });

    it('ignores tokens an operator deployed under another name', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce(accountEntry({ roles: ['viewer'] }))
        .mockResolvedValueOnce(accountCredentials(['operator-minted']));
      credentialStore.findExisting.mockResolvedValue(new Set([ACCOUNT_ID]));

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).resolves.toMatchObject({
        assumable: false,
      });
    });

    it('stays assumable when the token check cannot be completed', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce(accountEntry({ roles: ['viewer'] }))
        // A reader must not be told an account is unmanaged because one call did not land.
        .mockRejectedValueOnce(Boom.forbidden('insufficient privileges'));
      credentialStore.findExisting.mockResolvedValue(new Set([ACCOUNT_ID]));

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).resolves.toMatchObject({
        assumable: true,
      });
    });

    it('rejects with a 404 when there is no such account', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({});

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
      expect(credentialStore.findExisting).not.toHaveBeenCalled();
    });

    it('rejects with a 404 for a built-in account, which is not Kibana to list', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        'elastic/kibana': { type: 'built_in', role_descriptor: {} },
      });

      await expect(serviceAccounts.get(request, 'elastic/kibana')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('reports an id that is not namespace/service as missing, without reaching Elasticsearch', async () => {
      for (const id of ['nightshift-relay', 'kibana/../_cluster', 'a/b/c', '']) {
        await expect(serviceAccounts.get(request, id)).rejects.toMatchObject({
          output: { statusCode: 404 },
        });
      }
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    // Elasticsearch caps neither the role count nor the role name length, so an account created
    // outside Kibana can sit outside the bounds Kibana puts on its own creates. Such an account
    // lists fine, and must open fine too.
    it('reads an account whose roles fall outside the bounds of a Kibana create', async () => {
      const roles = Array.from({ length: SERVICE_ACCOUNT_MAX_ROLES + 1 }, (_, i) => `role-${i}`);
      roles.push('a'.repeat(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH + 1));
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(accountEntry({ roles }));

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).resolves.toMatchObject({
        id: ACCOUNT_ID,
        roles,
      });
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
