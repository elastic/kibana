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
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import {
  type AccessPolicy,
  type AclChange,
  AclChangeError,
  buildAclReadFilter,
  type EntryAccess,
  type GeneralAccess,
  ObjectAccessError,
  type Principal,
  type StoredAcl,
} from '@kbn/ols';
import type {
  AuditEvent,
  AuditLogger,
  CheckPrivilegesResponse,
} from '@kbn/security-plugin-types-server';

import { type AccessPolicyRegistry, OlsService } from './ols_service';
import { Actions } from '..';
import { userProfileMock } from '../../../common/model/user_profile.mock';
import { auditLoggerMock, auditServiceMock } from '../../audit/mocks';
import { userProfileServiceMock } from '../../user_profile/user_profile_service.mock';
import { authorizationMock } from '../index.mock';

const TYPE = 'widget';

const POLICY: AccessPolicy = {
  generalAccess: ['none', 'use', 'edit'],
  defaultGeneralAccess: 'edit',
  entryAccess: ['use'],
  operations: {
    view: { access: 'view', privileges: { savedObject: [{ type: TYPE, operation: 'get' }] } },
    use: { access: 'use', privileges: { api: ['execute-widget'] } },
    edit: { access: 'edit', privileges: { savedObject: [{ type: TYPE, operation: 'update' }] } },
    delete: { access: 'edit', privileges: { savedObject: [{ type: TYPE, operation: 'delete' }] } },
  },
};

const VIEW_ACTION = `saved_object:${TYPE}/get`;
const USE_ACTION = 'api:execute-widget';
const EDIT_ACTION = `saved_object:${TYPE}/update`;
const DELETE_ACTION = `saved_object:${TYPE}/delete`;
const RECOVERY_ACTION = `saved_object:${TYPE}/manage_access_control`;
const FEATURE_ACTIONS = [VIEW_ACTION, USE_ACTION, EDIT_ACTION, DELETE_ACTION];
const LOGIN_ACTION = new Actions().login;

const OWNER: Principal = { type: 'user', id: 'u_owner' };
const GRANTEE: Principal = { type: 'user', id: 'u_grantee' };
const STRANGER: Principal = { type: 'user', id: 'u_stranger' };
const SERVICE_ACCOUNT: Principal = { type: 'service_account', id: 'elastic/fleet-server' };

const createAcl = ({
  generalAccess = 'none',
  owner = OWNER,
  entries = [],
  version = 1,
}: {
  generalAccess?: GeneralAccess;
  owner?: Principal;
  entries?: Array<Principal & { access: EntryAccess }>;
  version?: number;
} = {}): StoredAcl => ({
  version: [version],
  owner: { type: [owner.type], id: [owner.id] },
  general: { access: [generalAccess] },
  entries: entries.map(({ type, id, access }) => ({
    type: [type],
    id: [id],
    access: [access],
    added_at: ['2026-10-01T00:00:00.000Z'],
  })),
});

const PRIVATE_ACL = createAcl();
const SHARED_ACL = createAcl({ entries: [{ ...GRANTEE, access: 'use' }] });

describe('ScopedOlsService', () => {
  let request: KibanaRequest;
  let authz: ReturnType<typeof authorizationMock.create>;
  let checkPrivileges: {
    atSpace: jest.Mock;
    atSpaces: jest.Mock;
    globally: jest.Mock;
  };
  let checkUserProfilesAtSpace: jest.Mock;
  let grantedActions: Set<string>;
  let auditLogger: jest.Mocked<AuditLogger>;
  let userProfiles: ReturnType<typeof userProfileServiceMock.createStart>;
  let serviceAccountExists: jest.Mock<Promise<boolean>, [string]>;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let policies: jest.Mocked<AccessPolicyRegistry>;
  let hasSession: jest.Mock<Promise<boolean>, [KibanaRequest]>;

  const toPrivilegesResponse = (
    resource: string | undefined,
    kibana: string[]
  ): CheckPrivilegesResponse => ({
    hasAllRequested: kibana.every((privilege) => grantedActions.has(privilege)),
    username: 'user',
    privileges: {
      kibana: kibana.map((privilege) => ({
        resource,
        privilege,
        authorized: grantedActions.has(privilege),
      })),
      elasticsearch: { cluster: [], index: {} },
    },
  });

  const createOlsService = ({
    enabled = true,
    spacesEnabled = true,
    getAuthenticatedPrincipal = jest.fn().mockReturnValue({ type: 'user', username: 'user' }),
  }: { enabled?: boolean; spacesEnabled?: boolean; getAuthenticatedPrincipal?: jest.Mock } = {}) =>
    new OlsService({
      enabled,
      spacesEnabled,
      clusterClient: elasticsearchServiceMock.createClusterClient(),
      authz,
      audit: { ...auditServiceMock.create(), asScoped: jest.fn().mockReturnValue(auditLogger) },
      policies,
      userProfiles,
      getAuthenticatedPrincipal,
      hasSession,
      serviceAccountExists,
      logger,
    });

  const asPrincipal = ({ id }: Principal) => userProfiles.getCurrentProfileId.mockResolvedValue(id);

  const getAuditActions = () => auditLogger.log.mock.calls.map(([event]) => event?.event?.action);

  const getEventActions = (events: AuditEvent[]) => events.map(({ event }) => event?.action);

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();

    grantedActions = new Set([...FEATURE_ACTIONS, LOGIN_ACTION]);
    checkPrivileges = {
      atSpace: jest.fn(async (spaceId: string, { kibana }: { kibana: string[] }) =>
        toPrivilegesResponse(spaceId, kibana)
      ),
      atSpaces: jest.fn(),
      globally: jest.fn(async ({ kibana }: { kibana: string[] }) =>
        toPrivilegesResponse(undefined, kibana)
      ),
    };
    checkUserProfilesAtSpace = jest.fn().mockResolvedValue({ hasPrivilegeUids: [], errorUids: [] });
    authz = { ...authorizationMock.create(), actions: new Actions() };
    authz.checkPrivilegesWithRequest.mockReturnValue(checkPrivileges);
    authz.checkUserProfilesPrivileges.mockReturnValue({ atSpace: checkUserProfilesAtSpace });

    auditLogger = auditLoggerMock.create();
    userProfiles = userProfileServiceMock.createStart();
    userProfiles.bulkGet.mockImplementation(async ({ uids }) =>
      [...uids].map((uid) => userProfileMock.create({ uid, enabled: true }))
    );
    serviceAccountExists = jest.fn().mockResolvedValue(true);
    logger = loggingSystemMock.createLogger();
    policies = {
      getAccessPolicy: jest.fn((type: string) => (type === TYPE ? POLICY : undefined)),
      getAllTypes: jest.fn().mockReturnValue([{ name: TYPE }]),
    };
    hasSession = jest.fn().mockResolvedValue(false);

    asPrincipal(OWNER);
  });

  describe('#getPrincipal', () => {
    it('resolves the principal once per request', async () => {
      const olsService = createOlsService();

      await expect(olsService.asScoped(request).getPrincipal()).resolves.toEqual(OWNER);
      await expect(olsService.asScoped(request).getPrincipal()).resolves.toEqual(OWNER);

      expect(userProfiles.getCurrentProfileId).toHaveBeenCalledTimes(1);
      expect(userProfiles.getCurrentProfileId).toHaveBeenCalledWith({ request });
    });

    it('returns no principal when OLS is disabled', async () => {
      await expect(
        createOlsService({ enabled: false }).asScoped(request).getPrincipal()
      ).resolves.toBeUndefined();
      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
    });
  });

  describe('#authorizeObjectAccess', () => {
    const authorize = (
      operation: string,
      acl: StoredAcl | undefined,
      olsService = createOlsService()
    ) =>
      olsService.asScoped(request).authorizeObjectAccess({
        type: TYPE,
        spaceId: 'default',
        operation,
        objects: [{ id: 'widget-1', acl }],
      });

    it('allows objects whose general access permits the operation without any lookup', async () => {
      await expect(authorize('edit', undefined)).resolves.toEqual(
        new Map([['widget-1', { status: 'allowed' }]])
      );
      await expect(authorize('use', createAcl({ generalAccess: 'use' }))).resolves.toEqual(
        new Map([['widget-1', { status: 'allowed' }]])
      );

      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
      expect(authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('allows every object of a type without an access policy', async () => {
      const decisions = await createOlsService()
        .asScoped(request)
        .authorizeObjectAccess({
          type: 'dashboard',
          spaceId: 'default',
          operation: 'view',
          objects: [{ id: 'dashboard-1', acl: PRIVATE_ACL }],
        });

      expect(decisions.get('dashboard-1')).toEqual({ status: 'allowed' });
      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
    });

    it('allows every object when OLS is disabled', async () => {
      asPrincipal(STRANGER);

      const decisions = await authorize('use', PRIVATE_ACL, createOlsService({ enabled: false }));

      expect(decisions.get('widget-1')).toEqual({ status: 'allowed' });
      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
      expect(authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
    });

    it('allows the owner and audits only operations from `use` up', async () => {
      const olsService = createOlsService();

      await expect(authorize('view', PRIVATE_ACL, olsService)).resolves.toEqual(
        new Map([['widget-1', { status: 'allowed' }]])
      );
      expect(auditLogger.log).not.toHaveBeenCalled();

      await expect(authorize('use', PRIVATE_ACL, olsService)).resolves.toEqual(
        new Map([['widget-1', { status: 'allowed' }]])
      );
      expect(getAuditActions()).toEqual(['ols_access']);
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({
          kibana: { space_id: 'default', saved_object: { type: TYPE, id: 'widget-1' } },
        })
      );

      // Neither access needed recovery.
      expect(authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
    });

    it('allows a grantee to use the object', async () => {
      asPrincipal(GRANTEE);

      await expect(authorize('use', SHARED_ACL)).resolves.toEqual(
        new Map([['widget-1', { status: 'allowed' }]])
      );
      expect(getAuditActions()).toEqual(['ols_access']);
    });

    it('masks an object from a stranger as missing and audits the denial once per request', async () => {
      asPrincipal(STRANGER);
      const olsService = createOlsService();

      await expect(authorize('view', PRIVATE_ACL, olsService)).resolves.toEqual(
        new Map([['widget-1', { status: 'not_found' }]])
      );
      await expect(authorize('view', PRIVATE_ACL, olsService)).resolves.toEqual(
        new Map([['widget-1', { status: 'not_found' }]])
      );

      expect(getAuditActions()).toEqual(['ols_denied']);
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ event: expect.objectContaining({ outcome: 'failure' }) })
      );
      // Recovery is checked once per request.
      expect(checkPrivileges.atSpace).toHaveBeenCalledTimes(1);
      expect(checkPrivileges.atSpace).toHaveBeenCalledWith('default', {
        kibana: [RECOVERY_ACTION],
      });
    });

    describe('with recovery', () => {
      beforeEach(() => {
        asPrincipal(STRANGER);
        grantedActions.add(RECOVERY_ACTION);
      });

      it('allows a view and audits the override', async () => {
        await expect(authorize('view', PRIVATE_ACL)).resolves.toEqual(
          new Map([['widget-1', { status: 'allowed' }]])
        );
        expect(getAuditActions()).toEqual(['ols_admin_override']);
      });

      it('reports other operations as forbidden rather than missing', async () => {
        await expect(authorize('use', PRIVATE_ACL)).resolves.toEqual(
          new Map([['widget-1', { status: 'forbidden', operation: 'use' }]])
        );
        expect(getAuditActions()).toEqual(['ols_denied']);
      });

      it('uses a primed answer instead of a privilege request', async () => {
        const olsService = createOlsService();
        olsService.primeRecovery(request, TYPE, ['default'], true);

        await expect(authorize('view', PRIVATE_ACL, olsService)).resolves.toEqual(
          new Map([['widget-1', { status: 'allowed' }]])
        );
        expect(authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
      });
    });

    it('logs a damaged ACL once per object and request', async () => {
      asPrincipal(STRANGER);
      const olsService = createOlsService();
      const damagedAcl = createAcl({ version: 2 });

      await olsService.asScoped(request).authorizeObjectAccess({
        type: TYPE,
        spaceId: 'default',
        operation: 'view',
        objects: [
          { id: 'widget-1', acl: damagedAcl },
          { id: 'widget-2', acl: damagedAcl },
        ],
      });
      await authorize('view', damagedAcl, olsService);

      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(`Invalid ACL on ${TYPE}:widget-1`);
      expect(logger.warn).toHaveBeenCalledWith(`Invalid ACL on ${TYPE}:widget-2`);
    });

    it('sets the principal on audit events of fake requests only', async () => {
      await authorize('use', PRIVATE_ACL);
      expect(auditLogger.log.mock.calls[0][0]).not.toHaveProperty('user');

      // A background task request carries no authenticated user, only its credential: here an API
      // key that the owner created.
      userProfiles.getApiKeyProfileId.mockResolvedValue(OWNER.id);
      const olsService = createOlsService();
      request = kibanaRequestFactory({
        headers: { authorization: `ApiKey ${Buffer.from('owner-key:secret').toString('base64')}` },
        auth: { isAuthenticated: true },
      });
      await authorize('use', PRIVATE_ACL, olsService);

      expect(auditLogger.log.mock.calls[1][0]).toEqual(
        expect.objectContaining({ user: { id: OWNER.id, entity: { type: 'user' } } })
      );
    });
  });

  describe('#ensureObjectAccess', () => {
    const ensureObjectAccess = (operation: string, acl: StoredAcl | undefined) =>
      createOlsService()
        .asScoped(request)
        .ensureObjectAccess({
          type: TYPE,
          spaceId: 'default',
          operation,
          objects: [{ id: 'widget-1', acl }],
        });

    it('resolves when every object allows the operation', async () => {
      await expect(ensureObjectAccess('use', PRIVATE_ACL)).resolves.toBeUndefined();
    });

    it('throws not_found for an object the caller cannot view', async () => {
      asPrincipal(STRANGER);

      await expect(ensureObjectAccess('use', PRIVATE_ACL)).rejects.toEqual(
        new ObjectAccessError('not_found', TYPE, 'widget-1', 'use')
      );
    });

    it('throws forbidden for an object the caller can view but cannot use for the operation', async () => {
      asPrincipal(GRANTEE);

      const error = await ensureObjectAccess('edit', SHARED_ACL).catch((e) => e);
      expect(error).toEqual(new ObjectAccessError('forbidden', TYPE, 'widget-1', 'edit'));
      expect(error.message).toBe(`Unable to edit ${TYPE} [id=widget-1]: missing "edit" access`);
    });
  });

  describe('#primeRecovery', () => {
    it('answers for the default space from a global check when Spaces is disabled', async () => {
      asPrincipal(STRANGER);
      const olsService = createOlsService({ spacesEnabled: false });
      olsService.primeRecovery(request, TYPE, ['*'], true);
      const scoped = olsService.asScoped(request);

      await expect(
        scoped.authorizeObjectAccess({
          type: TYPE,
          spaceId: 'default',
          operation: 'view',
          objects: [{ id: 'widget-1', acl: PRIVATE_ACL }],
        })
      ).resolves.toEqual(new Map([['widget-1', { status: 'allowed' }]]));
      expect(checkPrivileges.atSpace).not.toHaveBeenCalled();
    });

    it('keeps a global answer apart from the default space when Spaces is enabled', async () => {
      asPrincipal(STRANGER);
      const olsService = createOlsService();
      olsService.primeRecovery(request, TYPE, ['*'], true);

      await olsService.asScoped(request).authorizeObjectAccess({
        type: TYPE,
        spaceId: 'default',
        operation: 'view',
        objects: [{ id: 'widget-1', acl: PRIVATE_ACL }],
      });
      expect(checkPrivileges.atSpace).toHaveBeenCalledWith('default', {
        kibana: [RECOVERY_ACTION],
      });
    });
  });

  describe('#filterVisible', () => {
    it('keeps only the objects the caller can view', async () => {
      asPrincipal(GRANTEE);
      const objects = [
        { id: 'shared', acl: SHARED_ACL },
        { id: 'private', acl: PRIVATE_ACL },
        { id: 'public' },
      ];

      await expect(
        createOlsService()
          .asScoped(request)
          .filterVisible({ type: TYPE, spaceId: 'default', objects })
      ).resolves.toEqual([objects[0], objects[2]]);
      // Like a search, a list does not audit every object it leaves out.
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('lets recovery see everything, and audits it once for the list', async () => {
      asPrincipal(STRANGER);
      grantedActions = new Set([...grantedActions, RECOVERY_ACTION]);
      const objects = [
        { id: 'private-1', acl: PRIVATE_ACL },
        { id: 'private-2', acl: PRIVATE_ACL },
      ];

      await expect(
        createOlsService()
          .asScoped(request)
          .filterVisible({ type: TYPE, spaceId: 'default', objects })
      ).resolves.toEqual(objects);
      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log.mock.calls[0][0]?.event?.action).toBe('ols_admin_override');
    });

    it('audits no override when recovery shows nothing the caller could not view', async () => {
      grantedActions = new Set([...grantedActions, RECOVERY_ACTION]);
      const objects = [{ id: 'own', acl: PRIVATE_ACL }];

      await expect(
        createOlsService()
          .asScoped(request)
          .filterVisible({ type: TYPE, spaceId: 'default', objects })
      ).resolves.toEqual(objects);
      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('makes no lookup when nothing is restricted', async () => {
      const objects = [{ id: 'public' }];

      await expect(
        createOlsService()
          .asScoped(request)
          .filterVisible({ type: TYPE, spaceId: 'default', objects })
      ).resolves.toBe(objects);
      expect(checkPrivileges.atSpace).not.toHaveBeenCalled();
    });
  });

  describe('#getPermissions', () => {
    const evaluate = (acl: StoredAcl | undefined, olsService = createOlsService()) =>
      olsService.asScoped(request).getPermissions({ type: TYPE, spaceId: 'default', acl });

    it('checks feature privileges and recovery in one privilege request', async () => {
      await evaluate(PRIVATE_ACL);

      expect(checkPrivileges.atSpace).toHaveBeenCalledTimes(1);
      expect(checkPrivileges.atSpace).toHaveBeenCalledWith('default', {
        kibana: [...FEATURE_ACTIONS, RECOVERY_ACTION, LOGIN_ACTION],
      });
    });

    it('reports no recovery without the login action', async () => {
      asPrincipal(STRANGER);
      grantedActions = new Set([...FEATURE_ACTIONS, RECOVERY_ACTION]);

      const decision = await evaluate(PRIVATE_ACL);

      expect(decision.operationsViaRecovery.size).toBe(0);
      expect(decision.operations.has('view')).toBe(false);
    });

    it('drops operations the caller lacks feature privileges for', async () => {
      grantedActions = new Set([VIEW_ACTION, USE_ACTION]);

      const decision = await evaluate(PRIVATE_ACL);

      expect(decision.isOwner).toBe(true);
      expect([...decision.operations]).toEqual(['view', 'use']);
    });

    it('requires the privileges of `edit` for access management and transfer', async () => {
      grantedActions = new Set([VIEW_ACTION, USE_ACTION, EDIT_ACTION]);

      const decision = await evaluate(PRIVATE_ACL);

      expect([...decision.operations].sort()).toEqual(
        ['edit', 'manage_access', 'transfer', 'use', 'view'].sort()
      );
    });

    it('reports recovery and primes it for the rest of the request', async () => {
      asPrincipal(STRANGER);
      grantedActions.add(RECOVERY_ACTION);
      const olsService = createOlsService();

      const decision = await evaluate(PRIVATE_ACL, olsService);
      expect([...decision.operationsViaRecovery].sort()).toEqual([
        'manage_access',
        'transfer',
        'view',
      ]);

      checkPrivileges.atSpace.mockClear();
      await olsService.asScoped(request).authorizeObjectAccess({
        type: TYPE,
        spaceId: 'default',
        operation: 'view',
        objects: [{ id: 'widget-1', acl: PRIVATE_ACL }],
      });
      expect(checkPrivileges.atSpace).not.toHaveBeenCalled();
    });

    it('ignores the ACL and recovery, and resolves no principal, when OLS is disabled', async () => {
      grantedActions = new Set([VIEW_ACTION, USE_ACTION, RECOVERY_ACTION]);

      const decision = await evaluate(PRIVATE_ACL, createOlsService({ enabled: false }));

      expect(decision).toEqual(
        expect.objectContaining({ restricted: false, isOwner: false, access: 'edit' })
      );
      expect([...decision.operations]).toEqual(['view', 'use']);
      expect(decision.operationsViaRecovery.size).toBe(0);
      expect(checkPrivileges.atSpace).toHaveBeenCalledWith('default', { kibana: FEATURE_ACTIONS });
      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
    });

    it('allows a type operation that needs manage while OLS is disabled', async () => {
      policies.getAccessPolicy.mockReturnValue({
        ...POLICY,
        operations: {
          ...POLICY.operations,
          archive: { access: 'manage', privileges: { api: ['archive-widget'] } },
        },
      });
      grantedActions = new Set([...FEATURE_ACTIONS, 'api:archive-widget']);

      const decision = await evaluate(PRIVATE_ACL, createOlsService({ enabled: false }));

      expect([...decision.operations].sort()).toEqual(
        ['archive', 'delete', 'edit', 'use', 'view'].sort()
      );
    });
  });

  describe('#getReadFilter', () => {
    it('returns nothing for a type without an access policy or when disabled', async () => {
      await expect(
        createOlsService()
          .asScoped(request)
          .getReadFilter({ type: 'dashboard', spaceIds: ['default'] })
      ).resolves.toBeUndefined();
      await expect(
        createOlsService({ enabled: false })
          .asScoped(request)
          .getReadFilter({ type: TYPE, spaceIds: ['default'] })
      ).resolves.toBeUndefined();

      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
    });

    it('splits spaces by recovery and audits the override once per type and space', async () => {
      checkPrivileges.atSpaces.mockImplementation(async (spaceIds: string[], { kibana }) => ({
        hasAllRequested: false,
        username: 'user',
        privileges: {
          kibana: spaceIds.flatMap((spaceId) =>
            kibana.map((privilege: string) => ({
              resource: spaceId,
              privilege,
              authorized: privilege !== RECOVERY_ACTION || spaceId === 'space-a',
            }))
          ),
          elasticsearch: { cluster: [], index: {} },
        },
      }));
      const olsService = createOlsService();

      const filter = await olsService
        .asScoped(request)
        .getReadFilter({ type: TYPE, spaceIds: ['space-a', 'space-b'] });
      await olsService.asScoped(request).getReadFilter({ type: TYPE, spaceIds: ['space-a'] });

      // The spaces are checked in one request, which also needs the login action in each space.
      expect(checkPrivileges.atSpaces).toHaveBeenCalledTimes(1);
      expect(checkPrivileges.atSpaces).toHaveBeenCalledWith(['space-a', 'space-b'], {
        kibana: [RECOVERY_ACTION, authz.actions.login],
      });
      expect(checkPrivileges.atSpace).not.toHaveBeenCalled();

      expect(filter).toEqual(
        buildAclReadFilter({
          policy: POLICY,
          principal: OWNER,
          access: 'view',
          recoverySpaces: ['space-a'],
          ordinarySpaces: ['space-b'],
        })
      );
      expect(getAuditActions()).toEqual(['ols_admin_override']);
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ kibana: { space_id: 'space-a' } })
      );
    });

    it('makes no principal lookup when recovery covers every space', async () => {
      checkPrivileges.atSpaces.mockImplementation(async (spaceIds: string[], { kibana }) => ({
        hasAllRequested: true,
        username: 'user',
        privileges: {
          kibana: spaceIds.flatMap((spaceId) =>
            kibana.map((privilege: string) => ({ resource: spaceId, privilege, authorized: true }))
          ),
          elasticsearch: { cluster: [], index: {} },
        },
      }));

      const filter = await createOlsService()
        .asScoped(request)
        .getReadFilter({ type: TYPE, spaceIds: ['space-a', 'space-b'] });

      expect(filter).toEqual(
        buildAclReadFilter({
          policy: POLICY,
          access: 'view',
          recoverySpaces: ['space-a', 'space-b'],
          ordinarySpaces: [],
        })
      );
      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
      expect(userProfiles.getApiKeyProfileId).not.toHaveBeenCalled();
    });

    it('looks up the principal of a fake request alongside the recovery check', async () => {
      let answerRecovery = () => {};
      checkPrivileges.atSpaces.mockImplementation(
        (spaceIds: string[], { kibana }: { kibana: string[] }) =>
          new Promise((resolve) => {
            answerRecovery = () =>
              resolve({
                hasAllRequested: true,
                username: 'user',
                privileges: {
                  kibana: spaceIds.flatMap((spaceId) =>
                    kibana.map((privilege) => ({ resource: spaceId, privilege, authorized: true }))
                  ),
                  elasticsearch: { cluster: [], index: {} },
                },
              });
          })
      );
      userProfiles.getApiKeyProfileId.mockResolvedValue(OWNER.id);
      request = kibanaRequestFactory({
        headers: { authorization: `ApiKey ${Buffer.from('owner-key:secret').toString('base64')}` },
        auth: { isAuthenticated: true },
      });

      const filter = createOlsService()
        .asScoped(request)
        .getReadFilter({ type: TYPE, spaceIds: ['space-a', 'space-b'] });
      await new Promise(process.nextTick);
      // The recovery check hasn't answered yet, and the principal lookup has already started.
      expect(userProfiles.getApiKeyProfileId).toHaveBeenCalledWith(request);

      answerRecovery();
      await expect(filter).resolves.toEqual(
        buildAclReadFilter({
          policy: POLICY,
          principal: OWNER,
          access: 'view',
          recoverySpaces: ['space-a', 'space-b'],
          ordinarySpaces: [],
        })
      );
      // With recovery in every space, the filter doesn't use the principal: the audit events do.
      expect(auditLogger.log).toHaveBeenCalledTimes(2);
      for (const [event] of auditLogger.log.mock.calls) {
        expect(event).toEqual(
          expect.objectContaining({
            event: expect.objectContaining({ action: 'ols_admin_override' }),
            user: { id: OWNER.id, entity: { type: 'user' } },
          })
        );
      }
    });

    it('checks recovery globally for a search across all spaces', async () => {
      await createOlsService()
        .asScoped(request)
        .getReadFilter({ type: TYPE, spaceIds: ['*'] });

      expect(checkPrivileges.globally).toHaveBeenCalledWith({ kibana: [RECOVERY_ACTION] });
      expect(checkPrivileges.atSpace).not.toHaveBeenCalled();
    });
  });

  describe('#prepareInitialAcl', () => {
    it('makes the caller the owner with the requested access', async () => {
      const acl = await createOlsService()
        .asScoped(request)
        .prepareInitialAcl({
          type: TYPE,
          spaceId: 'default',
          id: 'widget-1',
          requested: { general: { access: 'none' }, entries: [{ ...GRANTEE, access: 'use' }] },
        });

      expect(acl).toEqual({
        version: 1,
        owner: OWNER,
        general: { access: 'none' },
        entries: [{ ...GRANTEE, access: 'use', added_at: expect.any(String) }],
      });
      expect(userProfiles.bulkGet).toHaveBeenCalledWith({ uids: new Set([GRANTEE.id]) });
    });

    it('audits the initial access with an unknown outcome, before the object is stored', async () => {
      await createOlsService()
        .asScoped(request)
        .prepareInitialAcl({
          type: TYPE,
          spaceId: 'default',
          id: 'widget-1',
          requested: { general: { access: 'none' }, entries: [{ ...GRANTEE, access: 'use' }] },
        });

      expect(auditLogger.log).toHaveBeenCalledTimes(1);
      expect(auditLogger.log.mock.calls[0][0]).toMatchObject({
        message:
          `User is creating ${TYPE} [id=widget-1] (operation: create) ` +
          '(general access: default -> none; entries: none -> user:u_grantee=use)',
        event: { action: 'ols_create', type: ['creation'], outcome: 'unknown' },
        kibana: { saved_object: { type: TYPE, id: 'widget-1' } },
      });
    });

    it('checks each recipient once per request when called again for the same object', async () => {
      const scoped = createOlsService().asScoped(request);
      const params = {
        type: TYPE,
        spaceId: 'default',
        id: 'widget-1',
        requested: {
          entries: [
            { ...GRANTEE, access: 'use' as const },
            { ...SERVICE_ACCOUNT, access: 'use' as const },
          ],
        },
      };

      await scoped.validateInitialAcl(params);
      await scoped.prepareInitialAcl(params);

      expect(userProfiles.bulkGet).toHaveBeenCalledTimes(1);
      expect(serviceAccountExists).toHaveBeenCalledTimes(1);
      // Validation audits nothing; only the call that stores the object does.
      expect(getAuditActions()).toEqual(['ols_create']);
    });

    it('audits each object of a bulk create in one space', async () => {
      const scoped = createOlsService().asScoped(request);

      await scoped.prepareInitialAcl({ type: TYPE, spaceId: 'default', id: 'widget-1' });
      await scoped.prepareInitialAcl({ type: TYPE, spaceId: 'default', id: 'widget-2' });

      expect(auditLogger.log.mock.calls.map(([event]) => event?.kibana?.saved_object)).toEqual([
        { type: TYPE, id: 'widget-1' },
        { type: TYPE, id: 'widget-2' },
      ]);
    });

    it('validates without auditing', async () => {
      await createOlsService()
        .asScoped(request)
        .validateInitialAcl({
          type: TYPE,
          spaceId: 'default',
          requested: { general: { access: 'none' } },
        });

      expect(auditLogger.log).not.toHaveBeenCalled();
    });

    it('returns nothing when disabled and nothing is requested', async () => {
      await expect(
        createOlsService({ enabled: false })
          .asScoped(request)
          .prepareInitialAcl({ type: TYPE, spaceId: 'default', id: 'widget-1' })
      ).resolves.toBeUndefined();
      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
    });

    it('rejects requested access when disabled', async () => {
      await expect(
        createOlsService({ enabled: false })
          .asScoped(request)
          .prepareInitialAcl({
            type: TYPE,
            spaceId: 'default',
            id: 'widget-1',
            requested: { general: { access: 'none' } },
          })
      ).rejects.toEqual(
        new AclChangeError('bad_request', 'Object-level security (OLS) is disabled.')
      );
    });

    it('rejects a type without an access policy', async () => {
      await expect(
        createOlsService()
          .asScoped(request)
          .prepareInitialAcl({ type: 'dashboard', spaceId: 'default', id: 'dashboard-1' })
      ).rejects.toMatchObject({ code: 'bad_request' });
    });

    it('rejects requested access when validating', async () => {
      userProfiles.bulkGet.mockResolvedValue([]);

      await expect(
        createOlsService()
          .asScoped(request)
          .validateInitialAcl({
            type: TYPE,
            spaceId: 'default',
            requested: { entries: [{ ...GRANTEE, access: 'use' }] },
          })
      ).rejects.toEqual(new AclChangeError('bad_request', 'User u_grantee cannot receive access.'));
    });
  });

  describe('#authorizeChange', () => {
    const authorizeChange = (
      change: AclChange,
      acl: StoredAcl | undefined,
      olsService = createOlsService()
    ) =>
      olsService
        .asScoped(request)
        .authorizeChange({ type: TYPE, id: 'widget-1', spaceId: 'default', acl, change });

    it('is rejected when OLS is disabled', async () => {
      await expect(
        authorizeChange({ kind: 'claim' }, undefined, createOlsService({ enabled: false }))
      ).rejects.toEqual(
        new AclChangeError('bad_request', 'Object-level security (OLS) is disabled.')
      );
    });

    it('replaces access and audits the change', async () => {
      checkUserProfilesAtSpace.mockResolvedValue({ hasPrivilegeUids: [GRANTEE.id], errorUids: [] });

      const result = await authorizeChange(
        {
          kind: 'replace',
          general: { access: 'use' },
          entries: [{ ...GRANTEE, access: 'use' }],
        },
        PRIVATE_ACL
      );

      expect(result).toEqual({
        next: {
          version: 1,
          owner: OWNER,
          general: { access: 'use' },
          entries: [{ ...GRANTEE, access: 'use', added_at: expect.any(String) }],
        },
        warnings: [],
        auditEvents: [
          expect.objectContaining({ event: expect.objectContaining({ action: 'ols_update' }) }),
        ],
      });
      // The caller logs the events once the change is stored.
      expect(auditLogger.log).not.toHaveBeenCalled();
      expect(result.auditEvents[0].message).toBe(
        `User has changed access to ${TYPE} [id=widget-1] (operation: manage_access) ` +
          '(general access: none -> use; entries: none -> user:u_grantee=use)'
      );
    });

    it('claims an object without an owner and records the general access it sets', async () => {
      const result = await authorizeChange(
        { kind: 'claim', general: { access: 'none' } },
        undefined
      );

      expect(result.next).toEqual({
        version: 1,
        owner: OWNER,
        general: { access: 'none' },
        entries: [],
      });
      expect(getEventActions(result.auditEvents)).toEqual(['ols_transfer']);
      expect(result.auditEvents[0].message).toContain(
        '(owner: none -> user:u_owner) (general access: default -> none; entries: none -> none)'
      );
    });

    it('transfers ownership and audits the transfer', async () => {
      checkUserProfilesAtSpace.mockResolvedValue({ hasPrivilegeUids: [GRANTEE.id], errorUids: [] });
      const result = await authorizeChange({ kind: 'transfer', owner: GRANTEE }, PRIVATE_ACL);

      expect(result.next.owner).toEqual(GRANTEE);
      expect(result.warnings).toEqual([]);
      expect(getEventActions(result.auditEvents)).toEqual(['ols_transfer']);
      expect(result.auditEvents[0].message).toContain('(owner: user:u_owner -> user:u_grantee)');
      expect(result.auditEvents[0].message).not.toContain('general access');
    });

    it('audits the override for a change that relied on recovery', async () => {
      asPrincipal(STRANGER);
      grantedActions.add(RECOVERY_ACTION);

      const transfer = await authorizeChange({ kind: 'transfer', owner: STRANGER }, PRIVATE_ACL);
      expect(getEventActions(transfer.auditEvents)).toEqual(['ols_transfer', 'ols_admin_override']);

      const replace = await authorizeChange(
        { kind: 'replace', general: { access: 'edit' }, entries: [] },
        PRIVATE_ACL
      );
      expect(getEventActions(replace.auditEvents)).toEqual(['ols_update', 'ols_admin_override']);
    });

    it('rejects a change the caller is not allowed to make and audits the denial', async () => {
      asPrincipal(GRANTEE);

      await expect(
        authorizeChange({ kind: 'transfer', owner: GRANTEE }, SHARED_ACL)
      ).rejects.toEqual(expect.objectContaining({ code: 'forbidden' }));
      expect(getAuditActions()).toEqual(['ols_denied']);
      expect(auditLogger.log.mock.calls[0][0]).toMatchObject({
        event: { outcome: 'failure' },
        kibana: { saved_object: { type: TYPE, id: 'widget-1' } },
      });
    });

    it('rejects a change on an object the caller cannot view and audits the denial', async () => {
      asPrincipal(STRANGER);

      await expect(
        authorizeChange({ kind: 'transfer', owner: STRANGER }, PRIVATE_ACL)
      ).rejects.toEqual(expect.objectContaining({ code: 'not_found' }));
      expect(getAuditActions()).toEqual(['ols_denied']);
    });

    it('looks up each recipient once when several changes are prepared at once', async () => {
      const olsService = createOlsService();
      const change: AclChange = {
        kind: 'replace',
        general: { access: 'none' },
        entries: [
          { ...GRANTEE, access: 'use' },
          { ...SERVICE_ACCOUNT, access: 'use' },
        ],
      };

      await Promise.all(
        ['widget-1', 'widget-2', 'widget-3'].map((id) =>
          olsService
            .asScoped(request)
            .authorizeChange({ type: TYPE, spaceId: 'default', id, change, acl: PRIVATE_ACL })
        )
      );

      expect(userProfiles.bulkGet).toHaveBeenCalledTimes(1);
      expect(serviceAccountExists).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['unknown', []],
      ['disabled', [userProfileMock.create({ uid: 'u_grantee', enabled: false })]],
    ])('rejects a grant to an %s user', async (_, profiles) => {
      userProfiles.bulkGet.mockResolvedValue(profiles);

      await expect(
        authorizeChange(
          {
            kind: 'replace',
            general: { access: 'none' },
            entries: [{ ...GRANTEE, access: 'use' }],
          },
          PRIVATE_ACL
        )
      ).rejects.toEqual(new AclChangeError('bad_request', 'User u_grantee cannot receive access.'));
    });

    it('checks that a service account recipient exists', async () => {
      serviceAccountExists.mockResolvedValue(false);

      await expect(
        authorizeChange({ kind: 'transfer', owner: SERVICE_ACCOUNT }, PRIVATE_ACL)
      ).rejects.toEqual(
        new AclChangeError(
          'bad_request',
          'Service account elastic/fleet-server cannot receive access.'
        )
      );
      expect(serviceAccountExists).toHaveBeenCalledWith(SERVICE_ACCOUNT.id);
      expect(userProfiles.bulkGet).not.toHaveBeenCalled();

      serviceAccountExists.mockResolvedValue(true);
      await expect(
        authorizeChange({ kind: 'transfer', owner: SERVICE_ACCOUNT }, PRIVATE_ACL)
      ).resolves.toEqual(
        expect.objectContaining({ next: expect.objectContaining({ owner: SERVICE_ACCOUNT }) })
      );
    });

    it('warns about users whose feature privileges do not cover their grant', async () => {
      const result = await authorizeChange(
        {
          kind: 'replace',
          general: { access: 'none' },
          entries: [{ ...GRANTEE, access: 'use' }],
        },
        PRIVATE_ACL
      );

      expect(result.warnings).toEqual([
        {
          target: 'entry',
          principal: GRANTEE,
          access: 'use',
          reason: 'missing_feature_privileges',
        },
      ]);
      expect(authz.checkUserProfilesPrivileges).toHaveBeenCalledWith(new Set([GRANTEE.id]));
      expect(checkUserProfilesAtSpace).toHaveBeenCalledWith('default', {
        kibana: [VIEW_ACTION, USE_ACTION],
      });
    });

    it('warns when the new owner of a transfer cannot view and edit the object', async () => {
      const result = await authorizeChange({ kind: 'transfer', owner: GRANTEE }, PRIVATE_ACL);

      expect(result.warnings).toEqual([
        { target: 'owner', principal: GRANTEE, reason: 'missing_feature_privileges' },
      ]);
      // Managing access and transferring need the privileges of `edit`, and nothing else.
      expect(checkUserProfilesAtSpace).toHaveBeenCalledWith('default', {
        kibana: [VIEW_ACTION, EDIT_ACTION],
      });
    });

    it('does not check feature privileges of a service account that becomes the owner', async () => {
      const result = await authorizeChange(
        { kind: 'transfer', owner: SERVICE_ACCOUNT },
        PRIVATE_ACL
      );

      expect(result.warnings).toEqual([]);
      expect(authz.checkUserProfilesPrivileges).not.toHaveBeenCalled();
    });
  });
});
