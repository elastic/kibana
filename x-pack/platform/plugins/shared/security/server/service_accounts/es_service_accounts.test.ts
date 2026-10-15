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
import {
  ES_SERVICE_ACCOUNT_MAX_ROLES,
  ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH,
} from './es_role_limits';
import { EsServiceAccounts } from './es_service_accounts';
import { UIAM_SERVICE_ACCOUNT_MAX_ROLES } from './uiam_role_limits';
import { licenseMock } from '../../common/licensing/index.mock';
import { auditLoggerMock, auditServiceMock } from '../audit/mocks';
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
  const createParams = { name: 'nightshift-relay', roles: ['viewer', 'editor'] };

  const createdAccount = {
    id: 'kibana/nightshift-relay',
    name: 'nightshift-relay',
    roles: ['viewer', 'editor'],
  };

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
  let audit: ReturnType<typeof auditServiceMock.create>;
  let auditLogger: ReturnType<typeof auditLoggerMock.create>;

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
    auditLogger = auditLoggerMock.create();
    audit = auditServiceMock.create();
    audit.asScoped.mockReturnValue(auditLogger);

    serviceAccounts = new EsServiceAccounts({
      requestLifetimeMs: 600_000,
      logger,
      license,
      clusterClient,
      checkPrivilegesWithRequest: jest.fn().mockReturnValue(mockCheckPrivileges),
      audit,
      credentialStore,
      canEncrypt: true,
      getCurrentUser,
      getCurrentUserProfileId,
    });
  });

  describe('#create', () => {
    it('persists the description in Elasticsearch and returns it to callers', async () => {
      mockHappyPath();
      const description = 'Reads events for investigation workflows.';
      await expect(
        serviceAccounts.create(request, { ...createParams, description })
      ).resolves.toEqual({
        ...createdAccount,
        description,
      });
      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT', body: { roles: createParams.roles, description } })
      );
    });

    it('rejects an oversized description before creating an account', async () => {
      await expect(
        serviceAccounts.create(request, { ...createParams, description: 'x'.repeat(1001) })
      ).rejects.toThrow();
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('creates the account, mints its token and stores the credential', async () => {
      mockHappyPath();

      await expect(serviceAccounts.create(request, createParams)).resolves.toEqual(createdAccount);

      const calls = esClient.asCurrentUser.transport.request.mock.calls;
      expect(calls[0][0]).toEqual(READ_ACCOUNT);
      expect(calls[1][0]).toEqual({
        method: 'PUT',
        path: ACCOUNT_PATH,
        body: { roles: ['viewer', 'editor'] },
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

      expect(Object.keys(created).sort()).toEqual(['id', 'name', 'roles']);
      expect(JSON.stringify(created)).not.toContain('AAEAAW');
    });

    // The creator's own roles never reach the account: Elasticsearch reports none at all for an
    // API key, and copying a user's would recreate the borrowed identity the feature replaces.
    it("assigns the requested roles regardless of the creator's", async () => {
      getCurrentUser.mockReturnValue(
        mockAuthenticatedUser({
          authentication_type: 'api_key',
          roles: [],
          api_key: { id: 'key-id', name: 'key-name', managed_by: 'elasticsearch' },
        })
      );
      mockHappyPath();

      await expect(serviceAccounts.create(request, createParams)).resolves.toEqual(createdAccount);

      expect(esClient.asCurrentUser.transport.request.mock.calls[1][0]).toEqual(
        expect.objectContaining({ body: { roles: ['viewer', 'editor'] } })
      );
      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('drops duplicate roles, keeping first occurrences in order', async () => {
      mockHappyPath();

      await expect(
        serviceAccounts.create(request, { ...createParams, roles: ['viewer', 'editor', 'viewer'] })
      ).resolves.toEqual(createdAccount);

      expect(esClient.asCurrentUser.transport.request.mock.calls[1][0]).toEqual(
        expect.objectContaining({ body: { roles: ['viewer', 'editor'] } })
      );
    });

    // Elasticsearch role names are case-sensitive, so these are two different roles.
    it('keeps roles that differ only in case', async () => {
      mockHappyPath();
      const roles = ['Viewer', 'viewer'];

      await expect(serviceAccounts.create(request, { ...createParams, roles })).resolves.toEqual({
        ...createdAccount,
        roles,
      });

      expect(esClient.asCurrentUser.transport.request.mock.calls[1][0]).toEqual(
        expect.objectContaining({ body: { roles } })
      );
    });

    // The two backends cap roles differently, so UIAM's lower cap must not leak into this one.
    it(`accepts more roles than UIAM allows, up to ${ES_SERVICE_ACCOUNT_MAX_ROLES}`, async () => {
      mockHappyPath();
      const roles = Array.from({ length: ES_SERVICE_ACCOUNT_MAX_ROLES }, (_, i) => `role-${i}`);
      expect(roles.length).toBeGreaterThan(UIAM_SERVICE_ACCOUNT_MAX_ROLES);

      await expect(
        serviceAccounts.create(request, { ...createParams, roles })
      ).resolves.toMatchObject({ roles });

      expect(esClient.asCurrentUser.transport.request.mock.calls[1][0]).toEqual(
        expect.objectContaining({ body: { roles } })
      );
    });

    it(`rejects more than ${ES_SERVICE_ACCOUNT_MAX_ROLES} distinct roles with a 400 before writing anything`, async () => {
      const roles = Array.from({ length: ES_SERVICE_ACCOUNT_MAX_ROLES + 1 }, (_, i) => `role-${i}`);

      await expect(
        serviceAccounts.create(request, { ...createParams, roles })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('`roles`'),
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it(`accepts a role name of ${ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH} characters, the most Elasticsearch allows`, async () => {
      mockHappyPath();
      const roles = ['a'.repeat(ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH)];

      await expect(
        serviceAccounts.create(request, { ...createParams, roles })
      ).resolves.toMatchObject({ roles });
    });

    it(`rejects a role name longer than ${ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH} characters with a 400 before writing anything`, async () => {
      const roles = ['a'.repeat(ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH + 1)];

      await expect(
        serviceAccounts.create(request, { ...createParams, roles })
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('`roles.0`'),
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it("rejects an omitted `roles` with a 400 rather than granting the creator's privileges", async () => {
      await expect(
        serviceAccounts.create(request, { name: 'nightshift-relay' } as never)
      ).rejects.toMatchObject({
        output: { statusCode: 400 },
        message: expect.stringContaining('`roles`'),
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects with a 409 when the name is taken, without writing anything', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(accountEntry());

      await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
        output: { statusCode: 409 },
      });

      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(1);
      expect(credentialStore.set).not.toHaveBeenCalled();
    });

    // Accounts can be written to this namespace without Kibana, so an account as wide as
    // Elasticsearch allows still has to read as "taken".
    it.each([
      [
        'as many roles as Elasticsearch allows',
        { roles: new Array(ES_SERVICE_ACCOUNT_MAX_ROLES).fill('viewer') },
      ],
      [
        'as long a role name as Elasticsearch allows',
        { roles: ['a'.repeat(ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH)] },
      ],
    ])('rejects with a 409 when the taken account holds %s', async (_, entry) => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(accountEntry(entry));

      await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
        output: { statusCode: 409 },
      });
      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(1);
    });

    it.each([
      [
        'more roles than Elasticsearch itself allows',
        { roles: new Array(ES_SERVICE_ACCOUNT_MAX_ROLES + 1).fill('viewer') },
      ],
      [
        'a longer role name than Elasticsearch itself allows',
        { roles: ['a'.repeat(ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH + 1)] },
      ],
    ])('refuses an account with %s', async (_, entry) => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(accountEntry(entry));

      await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
        output: { statusCode: 502 },
      });
    });

    // A third account type, a renamed field, or a role list outside Elasticsearch's own limits
    // would otherwise read as "the name is free", and the PUT that follows is a full replacement.
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

      await expect(serviceAccounts.create(request, createParams)).resolves.toEqual(createdAccount);
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
        requestLifetimeMs: 600_000,
        logger,
        license,
        clusterClient,
        checkPrivilegesWithRequest: jest.fn().mockReturnValue(mockCheckPrivileges),
        audit,
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
        serviceAccounts.create(request, { ...createParams, name: '../_cluster/settings' })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects an empty `roles` rather than writing an account with none', async () => {
      await expect(
        serviceAccounts.create(request, { ...createParams, roles: [] })
      ).rejects.toMatchObject({ output: { statusCode: 400 } });

      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
      expect(logger.warn).not.toHaveBeenCalled();
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

      await expect(serviceAccounts.create(request, createParams)).resolves.toEqual(createdAccount);

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

    it('sends the trimmed description with the account and reports it back', async () => {
      mockHappyPath();

      await expect(
        serviceAccounts.create(request, {
          ...createParams,
          description: ' Relays the nightshift alerts. ',
        })
      ).resolves.toEqual({ ...createdAccount, description: 'Relays the nightshift alerts.' });

      const calls = esClient.asCurrentUser.transport.request.mock.calls;
      expect(calls[1][0]).toEqual({
        method: 'PUT',
        path: ACCOUNT_PATH,
        body: { roles: ['viewer', 'editor'], description: 'Relays the nightshift alerts.' },
        querystring: { refresh: 'wait_for' },
      });
    });

    it('leaves a blank description out of the account write', async () => {
      mockHappyPath();

      const created = await serviceAccounts.create(request, {
        ...createParams,
        description: '   ',
      });

      expect(Object.keys(created).sort()).toEqual(['id', 'name', 'roles']);
      const calls = esClient.asCurrentUser.transport.request.mock.calls;
      expect(calls[1][0].body).toStrictEqual({ roles: ['viewer', 'editor'] });
    });

    it('refuses rather than overwriting an account whose description it cannot read', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(
        accountEntry({ description: 42 })
      );

      await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
        output: { statusCode: 502 },
      });
      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(1);
    });

    describe('audit', () => {
      const createEvent = (outcome: 'success' | 'failure') =>
        expect.objectContaining({
          event: expect.objectContaining({
            action: 'service_account_create',
            category: ['iam'],
            type: ['user', 'creation'],
            outcome,
          }),
        });

      it('logs a `success` event naming the created account, scoped to the request', async () => {
        mockHappyPath();

        await serviceAccounts.create(request, createParams);

        expect(audit.asScoped).toHaveBeenCalledWith(request);
        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(createEvent('success'));
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            user: { target: { id: 'kibana/nightshift-relay', name: 'nightshift-relay' } },
            message:
              'User has created service account [id=kibana/nightshift-relay, name=nightshift-relay]',
          })
        );
      });

      it('logs a `failure` event with the name when the caller is not authorized', async () => {
        mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

        await expect(serviceAccounts.create(request, createParams)).rejects.toThrow();

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(createEvent('failure'));
        expect(auditLogger.log).toHaveBeenCalledWith(
          expect.objectContaining({
            user: { target: { name: 'nightshift-relay' } },
            error: {
              code: 'Error',
              message:
                'Cannot create a service account: missing `manage_security` cluster privilege',
            },
          })
        );
      });

      it('logs a `failure` event without a target when the refused name did not validate', async () => {
        mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

        await expect(
          serviceAccounts.create(request, { ...createParams, name: '../_cluster/settings' })
        ).rejects.toMatchObject({ output: { statusCode: 403 } });

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(createEvent('failure'));
        expect(auditLogger.log.mock.calls[0][0]).not.toHaveProperty('user');
      });

      it('logs nothing when security features are disabled', async () => {
        license.isEnabled.mockReturnValue(false);

        await expect(serviceAccounts.create(request, createParams)).rejects.toThrow();

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs nothing when the name is taken', async () => {
        esClient.asCurrentUser.transport.request.mockResolvedValueOnce(accountEntry());

        await expect(serviceAccounts.create(request, createParams)).rejects.toMatchObject({
          output: { statusCode: 409 },
        });

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs nothing when the name did not validate', async () => {
        await expect(
          serviceAccounts.create(request, { ...createParams, name: '../_cluster/settings' })
        ).rejects.toMatchObject({ output: { statusCode: 400 } });

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs nothing when the credential cannot be stored and the account is rolled back', async () => {
        mockHappyPath();
        credentialStore.set.mockRejectedValueOnce(new Error('encryption failed'));

        await expect(serviceAccounts.create(request, createParams)).rejects.toThrow(
          'encryption failed'
        );

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      const leftBehindEvent = expect.objectContaining({
        event: expect.objectContaining({ action: 'service_account_create', outcome: 'unknown' }),
        user: { target: { id: 'kibana/nightshift-relay', name: 'nightshift-relay' } },
        error: { code: 'Error', message: 'encryption failed' },
        message:
          'Failed attempt to create service account [id=kibana/nightshift-relay, name=nightshift-relay], which might have been left behind',
      });

      it('logs `unknown` naming the account when the rollback cannot delete it', async () => {
        mockHappyPath();
        credentialStore.set.mockRejectedValueOnce(new Error('encryption failed'));
        esClient.asCurrentUser.transport.request
          .mockResolvedValueOnce({}) // token delete
          .mockRejectedValueOnce(new Error('account delete failed'));

        await expect(serviceAccounts.create(request, createParams)).rejects.toThrow(
          'encryption failed'
        );

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(leftBehindEvent);
      });

      it('logs nothing when only the token delete of the rollback fails', async () => {
        mockHappyPath();
        credentialStore.set.mockRejectedValueOnce(new Error('encryption failed'));
        esClient.asCurrentUser.transport.request
          .mockRejectedValueOnce(new Error('token delete failed'))
          .mockResolvedValueOnce({}); // forced account delete

        await expect(serviceAccounts.create(request, createParams)).rejects.toThrow(
          'encryption failed'
        );

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs nothing when only the credential delete of the rollback fails', async () => {
        mockHappyPath();
        credentialStore.set.mockRejectedValueOnce(new Error('encryption failed'));
        credentialStore.delete.mockRejectedValueOnce(new Error('credential delete failed'));

        await expect(serviceAccounts.create(request, createParams)).rejects.toThrow(
          'encryption failed'
        );

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs `unknown` when a failed account write cannot be reconciled', async () => {
        esClient.asCurrentUser.transport.request
          .mockResolvedValueOnce({}) // pre-flight GET: no such account
          .mockRejectedValueOnce(new Error('encryption failed')) // PUT
          .mockRejectedValueOnce(new Error('read failed')); // reconciliation GET

        await expect(serviceAccounts.create(request, createParams)).rejects.toThrow(
          'encryption failed'
        );

        expect(auditLogger.log).toHaveBeenCalledTimes(1);
        expect(auditLogger.log).toHaveBeenCalledWith(leftBehindEvent);
      });

      it('logs nothing when a failed account write is confirmed never to have committed', async () => {
        esClient.asCurrentUser.transport.request
          .mockResolvedValueOnce({}) // pre-flight GET
          .mockRejectedValueOnce(new Error('write failed')) // PUT
          .mockResolvedValueOnce({}); // reconciliation GET: still absent

        await expect(serviceAccounts.create(request, createParams)).rejects.toThrow('write failed');

        expect(auditLogger.log).not.toHaveBeenCalled();
      });

      it('logs nothing when the account left after a failed write is removed', async () => {
        esClient.asCurrentUser.transport.request
          .mockResolvedValueOnce({}) // pre-flight GET
          .mockRejectedValueOnce(new Error('write failed')) // PUT
          .mockResolvedValueOnce(accountEntry()) // reconciliation GET: present
          .mockResolvedValueOnce(accountCredentials()) // no token: ours
          .mockResolvedValueOnce({}) // token delete
          .mockResolvedValueOnce({}); // forced account delete

        await expect(serviceAccounts.create(request, createParams)).rejects.toThrow('write failed');

        expect(auditLogger.log).not.toHaveBeenCalled();
        expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(6);
      });

      it('logs `unknown` when the account left after a failed write cannot be removed', async () => {
        esClient.asCurrentUser.transport.request
          .mockResolvedValueOnce({}) // pre-flight GET
          .mockRejectedValueOnce(new Error('encryption failed')) // PUT
          .mockResolvedValueOnce(accountEntry()) // reconciliation GET: present
          .mockResolvedValueOnce(accountCredentials()) // no token: ours
          .mockResolvedValueOnce({}) // token delete
          .mockRejectedValueOnce(new Error('account delete failed'));

        await expect(serviceAccounts.create(request, createParams)).rejects.toThrow(
          'encryption failed'
        );

        expect(auditLogger.log).toHaveBeenCalledWith(leftBehindEvent);
      });

      it("logs nothing when the account left after a failed write is a concurrent create's", async () => {
        esClient.asCurrentUser.transport.request
          .mockResolvedValueOnce({}) // pre-flight GET
          .mockRejectedValueOnce(new Error('write failed')) // PUT
          .mockResolvedValueOnce(accountEntry()) // reconciliation GET: present
          .mockResolvedValueOnce(accountCredentials(['kibana-managed'])); // holds a token: not ours

        await expect(serviceAccounts.create(request, createParams)).rejects.toThrow('write failed');

        expect(auditLogger.log).not.toHaveBeenCalled();
        expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledTimes(4);
      });
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
          queried('kibana/nightshift-relay', { description: 'Runs investigation workflows.' }),
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
            description: 'Runs investigation workflows.',
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

    it('reports the description of each account that has one', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        service_accounts: [
          queried('kibana/a', { description: 'Relays the nightshift alerts.' }),
          queried('kibana/b'),
        ],
      });

      const {
        serviceAccounts: [described, undescribed],
      } = await serviceAccounts.list(request);

      expect(described.description).toBe('Relays the nightshift alerts.');
      expect(undescribed).not.toHaveProperty('description');
    });

    it('omits an empty or null description', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce({
        service_accounts: [
          queried('kibana/a', { description: '' }),
          queried('kibana/b', { description: null }),
        ],
      });

      const { serviceAccounts: entries } = await serviceAccounts.list(request);

      expect(entries[0]).not.toHaveProperty('description');
      expect(entries[1]).not.toHaveProperty('description');
    });
  });

  describe('#get', () => {
    const ACCOUNT_ID = 'kibana/nightshift-relay';

    it('reads the user-managed account and confirms it is assumable', async () => {
      esClient.asCurrentUser.transport.request
        .mockResolvedValueOnce(
          accountEntry({ roles: ['viewer'], description: 'Runs investigation workflows.' })
        )
        // The account still holds Kibana's token, so the stored credential describes it.
        .mockResolvedValueOnce(accountCredentials(['kibana-managed']));
      credentialStore.findExisting.mockResolvedValue(new Set([ACCOUNT_ID]));

      // The credential records who asked Kibana to create the account, and none of it is
      // reported: Elasticsearch does not store a creator yet, and Kibana will not invent one.
      await expect(serviceAccounts.get(request, ACCOUNT_ID)).resolves.toEqual({
        id: ACCOUNT_ID,
        name: 'nightshift-relay',
        description: 'Runs investigation workflows.',
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

    // An account created outside Kibana is still held to Elasticsearch's own limits, so one at
    // those limits lists fine, and must open fine too.
    it('reads an account with as many roles, and as long a role name, as Elasticsearch allows', async () => {
      const roles = Array.from({ length: ES_SERVICE_ACCOUNT_MAX_ROLES - 1 }, (_, i) => `role-${i}`);
      roles.push('a'.repeat(ES_SERVICE_ACCOUNT_ROLE_NAME_MAX_LENGTH));
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

    it('reports the description Elasticsearch holds for the account', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(
        accountEntry({ description: 'Relays the nightshift alerts.' })
      );

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).resolves.toMatchObject({
        description: 'Relays the nightshift alerts.',
      });
    });

    // Elasticsearch caps a description at 1,000 characters on write, so Kibana does not bound it
    // again on read.
    it('reports a description longer than Kibana accepts on create', async () => {
      const description = 'a'.repeat(1001);
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(accountEntry({ description }));

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).resolves.toMatchObject({
        description,
      });
    });

    it('omits the description when Elasticsearch reports none', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(accountEntry());

      expect(await serviceAccounts.get(request, ACCOUNT_ID)).not.toHaveProperty('description');
    });

    it('answers 502 for a description that is not a string', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(
        accountEntry({ description: 42 })
      );

      await expect(serviceAccounts.get(request, ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 502 },
      });
    });

    it('omits an empty description', async () => {
      esClient.asCurrentUser.transport.request.mockResolvedValueOnce(
        accountEntry({ description: '' })
      );

      expect(await serviceAccounts.get(request, ACCOUNT_ID)).not.toHaveProperty('description');
    });
  });

  describe('#delete', () => {
    const ACCOUNT_ID = 'kibana/nightshift-relay';
    const DELETE_ACCOUNT = { method: 'DELETE', path: ACCOUNT_PATH };
    const deleteToken = (tokenName: string) => ({
      method: 'DELETE',
      path: `${CREDENTIALS_PATH}/token/${tokenName}`,
    });
    const undeletedTokensWarning = (tokenNames: string) =>
      `Service account [${ACCOUNT_ID}] was deleted, but its tokens [${tokenNames}] could not be. ` +
      'They can no longer authenticate, but an account named [nightshift-relay] cannot be ' +
      'created again until they are deleted.';

    /**
     * Answers the account read, the token read and the deletes from one table, so a test can make
     * any one of them fail without caring about the order they arrive in.
     */
    const mockElasticsearch = ({
      account = accountEntry() as object,
      tokenNames = ['kibana-managed'],
      failingPaths = [] as string[],
    } = {}) => {
      esClient.asCurrentUser.transport.request.mockImplementation(async (params) => {
        const { method, path } = params as { method: string; path: string };
        if (failingPaths.includes(path)) {
          throw new Error(`${method} ${path} failed`);
        }
        if (method === 'GET' && path === ACCOUNT_PATH) return account;
        if (method === 'GET' && path === CREDENTIALS_PATH) return accountCredentials(tokenNames);
        return { found: true };
      });
    };

    beforeEach(() => {
      esClient.asCurrentUser.security.invalidateToken.mockResolvedValue({
        invalidated_tokens: 1,
        previously_invalidated_tokens: 0,
        error_count: 0,
      });
    });

    it('deletes every token, then the credential, then the account without `force`', async () => {
      const order: string[] = [];
      credentialStore.delete.mockImplementation(async () => {
        order.push('credential');
        return true;
      });
      esClient.asCurrentUser.transport.request.mockImplementation(async (params) => {
        const { method, path } = params as { method: string; path: string };
        order.push(`${method} ${path}`);
        if (method === 'GET' && path === ACCOUNT_PATH) return accountEntry();
        if (method === 'GET') return accountCredentials(['kibana-managed', 'operator-token']);
        return { found: true };
      });

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).resolves.toEqual({ warnings: [] });

      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['manage_security'], index: {} },
      });
      expect(order).toEqual([
        `GET ${ACCOUNT_PATH}`,
        `GET ${CREDENTIALS_PATH}`,
        `DELETE ${CREDENTIALS_PATH}/token/kibana-managed`,
        `DELETE ${CREDENTIALS_PATH}/token/operator-token`,
        'credential',
        `DELETE ${ACCOUNT_PATH}`,
      ]);
      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledWith(DELETE_ACCOUNT, {
        ignore: [404],
      });
      expect(credentialStore.delete).toHaveBeenCalledWith(ACCOUNT_ID);
    });

    it('invalidates the access tokens the account was issued', async () => {
      mockElasticsearch();

      await serviceAccounts.delete(request, ACCOUNT_ID);

      expect(esClient.asCurrentUser.security.invalidateToken).toHaveBeenCalledWith(
        { username: ACCOUNT_ID, realm_name: '_service_account' },
        { ignore: [404] }
      );
    });

    it('warns when the access tokens cannot be invalidated', async () => {
      mockElasticsearch();
      esClient.asCurrentUser.security.invalidateToken.mockRejectedValue(new Error('unavailable'));

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).resolves.toEqual({
        warnings: [
          `Service account [${ACCOUNT_ID}] was deleted, but the access tokens it was issued could ` +
            'not be invalidated.',
        ],
      });
      expect(credentialStore.delete).toHaveBeenCalledWith(ACCOUNT_ID);
    });

    it('forces the account delete past a token it could not delete, and warns about it', async () => {
      mockElasticsearch({
        tokenNames: ['kibana-managed', 'operator-token'],
        failingPaths: [`${CREDENTIALS_PATH}/token/operator-token`],
      });

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).resolves.toEqual({
        warnings: [undeletedTokensWarning('operator-token')],
      });

      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledWith(
        { ...DELETE_ACCOUNT, querystring: { force: 'true' } },
        { ignore: [404] }
      );
      expect(credentialStore.delete).toHaveBeenCalledWith(ACCOUNT_ID);
      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('Failed to delete token [operator-token]')
      );
    });

    it('deletes the credential after the account when Kibana’s own token was left behind', async () => {
      mockElasticsearch({ failingPaths: [`${CREDENTIALS_PATH}/token/kibana-managed`] });
      const order: string[] = [];
      credentialStore.delete.mockImplementation(async () => {
        order.push('credential');
        return true;
      });
      const answer = esClient.asCurrentUser.transport.request.getMockImplementation()!;
      esClient.asCurrentUser.transport.request.mockImplementation(async (params, options) => {
        const { method, path } = params as { method: string; path: string };
        if (method === 'DELETE' && path === ACCOUNT_PATH) order.push('account');
        return answer(params, options);
      });

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).resolves.toEqual({
        warnings: [undeletedTokensWarning('kibana-managed')],
      });
      expect(order).toEqual(['account', 'credential']);
    });

    it('still reports the leftover tokens when the late credential delete fails', async () => {
      mockElasticsearch({ failingPaths: [`${CREDENTIALS_PATH}/token/kibana-managed`] });
      credentialStore.delete.mockRejectedValue(new Error('saved objects unavailable'));

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).resolves.toEqual({
        warnings: [undeletedTokensWarning('kibana-managed')],
      });
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('failed to delete its credential')
      );
    });

    it('keeps the account when the credential delete fails, so a retry can finish', async () => {
      mockElasticsearch();
      const error = new Error('saved objects unavailable');
      credentialStore.delete.mockRejectedValue(error);

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).rejects.toBe(error);

      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalledWith(
        DELETE_ACCOUNT,
        expect.anything()
      );
      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining(`Failed to delete service account [${ACCOUNT_ID}]`)
      );
    });

    it('surfaces an account delete that Elasticsearch refuses', async () => {
      esClient.asCurrentUser.transport.request.mockImplementation(async (params) => {
        const { method, path } = params as { method: string; path: string };
        if (method === 'GET' && path === ACCOUNT_PATH) return accountEntry();
        if (method === 'GET') return accountCredentials(['kibana-managed']);
        if (path === ACCOUNT_PATH) throw new Error('cannot delete service account');
        return { found: true };
      });

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).rejects.toThrow(
        'cannot delete service account'
      );
      expect(esClient.asCurrentUser.security.invalidateToken).not.toHaveBeenCalled();
    });

    it('deletes tokens left over from an account that is already gone', async () => {
      mockElasticsearch({ account: {}, tokenNames: ['operator-token'] });

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).resolves.toEqual({ warnings: [] });

      expect(esClient.asCurrentUser.transport.request).toHaveBeenCalledWith(
        deleteToken('operator-token'),
        { ignore: [404] }
      );
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalledWith(
        DELETE_ACCOUNT,
        expect.anything()
      );
      // A concurrent create may already have written a credential under this id.
      expect(credentialStore.delete).not.toHaveBeenCalled();
      expect(esClient.asCurrentUser.security.invalidateToken).toHaveBeenCalledWith(
        { username: ACCOUNT_ID, realm_name: '_service_account' },
        { ignore: [404] }
      );
    });

    it('reads the account again before deleting tokens left over from it', async () => {
      const order: string[] = [];
      esClient.asCurrentUser.transport.request.mockImplementation(async (params) => {
        const { method, path } = params as { method: string; path: string };
        order.push(`${method} ${path}`);
        if (method === 'GET' && path === ACCOUNT_PATH) return {};
        if (method === 'GET') return accountCredentials(['operator-token']);
        return { found: true };
      });

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).resolves.toEqual({ warnings: [] });

      expect(order).toEqual([
        `GET ${ACCOUNT_PATH}`,
        `GET ${CREDENTIALS_PATH}`,
        `GET ${ACCOUNT_PATH}`,
        `DELETE ${CREDENTIALS_PATH}/token/operator-token`,
      ]);
    });

    it('deletes an account created again while its leftover tokens were read, as a whole', async () => {
      const order: string[] = [];
      credentialStore.delete.mockImplementation(async () => {
        order.push('credential');
        return true;
      });
      let accountReads = 0;
      esClient.asCurrentUser.transport.request.mockImplementation(async (params) => {
        const { method, path } = params as { method: string; path: string };
        order.push(`${method} ${path}`);
        if (method === 'GET' && path === ACCOUNT_PATH) {
          accountReads++;
          return accountReads === 1 ? {} : accountEntry();
        }
        if (method === 'GET') return accountCredentials(['kibana-managed']);
        return { found: true };
      });

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).resolves.toEqual({ warnings: [] });

      expect(order).toEqual([
        `GET ${ACCOUNT_PATH}`,
        `GET ${CREDENTIALS_PATH}`,
        `GET ${ACCOUNT_PATH}`,
        `GET ${CREDENTIALS_PATH}`,
        `DELETE ${CREDENTIALS_PATH}/token/kibana-managed`,
        'credential',
        `DELETE ${ACCOUNT_PATH}`,
      ]);
    });

    it('invalidates access tokens left over from an account that is already gone', async () => {
      mockElasticsearch({ account: {}, tokenNames: [] });
      esClient.asCurrentUser.security.invalidateToken.mockResolvedValue({
        invalidated_tokens: 2,
        previously_invalidated_tokens: 0,
        error_count: 0,
      });

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).resolves.toEqual({ warnings: [] });
      expect(credentialStore.delete).not.toHaveBeenCalled();
    });

    it.each([
      ['with leftover tokens', ['operator-token']],
      ['without leftover tokens', []],
    ])(
      'warns when an account that is already gone keeps its access tokens, %s',
      async (_, tokenNames) => {
        mockElasticsearch({ account: {}, tokenNames });
        esClient.asCurrentUser.security.invalidateToken.mockRejectedValue(new Error('unavailable'));

        await expect(serviceAccounts.delete(request, ACCOUNT_ID)).resolves.toEqual({
          warnings: [
            `Service account [${ACCOUNT_ID}] was deleted, but the access tokens it was issued ` +
              'could not be invalidated.',
          ],
        });
      }
    );

    it('rejects with a 404 when the account is gone and left nothing behind', async () => {
      mockElasticsearch({ account: {}, tokenNames: [] });
      esClient.asCurrentUser.security.invalidateToken.mockResolvedValue({
        invalidated_tokens: 0,
        previously_invalidated_tokens: 0,
        error_count: 0,
      });
      credentialStore.findExisting.mockResolvedValue(new Set([ACCOUNT_ID]));

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
      expect(credentialStore.delete).not.toHaveBeenCalled();
      expect(logger.error).not.toHaveBeenCalled();
    });

    it('rejects with a 404 for a built-in account without touching its tokens', async () => {
      await expect(serviceAccounts.delete(request, 'elastic/fleet-server')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects with a 404 for an id that is not `{namespace}/{service}`', async () => {
      await expect(serviceAccounts.delete(request, 'not-a-principal')).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects with a 403 when security features are disabled in Elasticsearch', async () => {
      license.isEnabled.mockReturnValue(false);

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
    });

    it('rejects with a 403 when the caller lacks the `manage_security` cluster privilege', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(serviceAccounts.delete(request, ACCOUNT_ID)).rejects.toMatchObject({
        output: { statusCode: 403 },
      });
      expect(esClient.asCurrentUser.transport.request).not.toHaveBeenCalled();
      expect(credentialStore.delete).not.toHaveBeenCalled();
    });
  });
});
