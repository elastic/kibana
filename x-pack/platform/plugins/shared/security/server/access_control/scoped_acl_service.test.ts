/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  type AccessPolicy,
  type AclChange,
  AclChangeError,
  buildAclReadFilter,
  type CanonicalAcl,
  type EntryLevel,
  type GeneralAccessLevel,
  type Principal,
} from '@kbn/access-control';
import type { KibanaRequest } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  httpServerMock,
  loggingSystemMock,
} from '@kbn/core/server/mocks';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { typeRegistryMock } from '@kbn/core-saved-objects-base-server-mocks';
import type { AuditLogger, CheckPrivilegesResponse } from '@kbn/security-plugin-types-server';

import { AclService } from './acl_service';
import { userProfileMock } from '../../common/model/user_profile.mock';
import { auditLoggerMock, auditServiceMock } from '../audit/mocks';
import { Actions } from '../authorization';
import { authorizationMock } from '../authorization/index.mock';
import { userProfileServiceMock } from '../user_profile/user_profile_service.mock';

const TYPE = 'widget';

const POLICY: AccessPolicy = {
  generalAccess: { default: 'edit', allowed: ['none', 'use', 'edit'] },
  entryLevels: ['use'],
  operations: {
    view: { level: 'view', privileges: { savedObject: [{ type: TYPE, operation: 'get' }] } },
    use: { level: 'use', privileges: { api: ['execute-widget'] } },
    edit: { level: 'edit', privileges: { savedObject: [{ type: TYPE, operation: 'update' }] } },
    delete: { level: 'edit', privileges: { savedObject: [{ type: TYPE, operation: 'delete' }] } },
  },
};

const VIEW_ACTION = `saved_object:${TYPE}/get`;
const USE_ACTION = 'api:execute-widget';
const EDIT_ACTION = `saved_object:${TYPE}/update`;
const DELETE_ACTION = `saved_object:${TYPE}/delete`;
const RECOVERY_ACTION = `saved_object:${TYPE}/manage_access_control`;
const FEATURE_ACTIONS = [VIEW_ACTION, USE_ACTION, EDIT_ACTION, DELETE_ACTION];

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
  generalAccess?: GeneralAccessLevel;
  owner?: Principal;
  entries?: Array<Principal & { access: EntryLevel }>;
  version?: number;
} = {}): CanonicalAcl => ({
  version: [version],
  owner: { type: [owner.type], id: [owner.id] },
  general_access: [generalAccess],
  entries: entries.map(({ type, id, access }) => ({
    type: [type],
    id: [id],
    access: [access],
    added_at: ['2026-10-01T00:00:00.000Z'],
  })),
});

const PRIVATE_ACL = createAcl();
const SHARED_ACL = createAcl({ entries: [{ ...GRANTEE, access: 'use' }] });

describe('ScopedAclService', () => {
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
  let typeRegistry: ReturnType<typeof typeRegistryMock.create>;

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

  const createAclService = ({ enabled = true }: { enabled?: boolean } = {}) =>
    new AclService({
      enabled,
      clusterClient: elasticsearchServiceMock.createClusterClient(),
      authz,
      audit: { ...auditServiceMock.create(), asScoped: jest.fn().mockReturnValue(auditLogger) },
      typeRegistry,
      userProfiles,
      getAuthenticatedPrincipal: jest.fn().mockReturnValue({ type: 'user', username: 'user' }),
      serviceAccountExists,
      logger,
    });

  const asPrincipal = ({ id }: Principal) => userProfiles.getCurrentProfileId.mockResolvedValue(id);

  const getAuditActions = () => auditLogger.log.mock.calls.map(([event]) => event?.event?.action);

  beforeEach(() => {
    request = httpServerMock.createKibanaRequest();

    grantedActions = new Set(FEATURE_ACTIONS);
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
    typeRegistry = typeRegistryMock.create();
    typeRegistry.getAccessPolicy.mockImplementation((type) => (type === TYPE ? POLICY : undefined));

    asPrincipal(OWNER);
  });

  describe('#getPrincipal', () => {
    it('resolves the principal once per request', async () => {
      const aclService = createAclService();

      await expect(aclService.asScoped(request).getPrincipal()).resolves.toEqual(OWNER);
      await expect(aclService.asScoped(request).getPrincipal()).resolves.toEqual(OWNER);

      expect(userProfiles.getCurrentProfileId).toHaveBeenCalledTimes(1);
      expect(userProfiles.getCurrentProfileId).toHaveBeenCalledWith({ request });
    });

    it('uses a principal the caller vouches for without a lookup, also in later scopes', async () => {
      const aclService = createAclService();

      await expect(
        aclService.asScoped(request, { principal: SERVICE_ACCOUNT }).getPrincipal()
      ).resolves.toEqual(SERVICE_ACCOUNT);
      await expect(aclService.asScoped(request).getPrincipal()).resolves.toEqual(SERVICE_ACCOUNT);

      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
    });
  });

  describe('#authorize', () => {
    const authorize = (
      operation: string,
      acl: CanonicalAcl | undefined,
      aclService = createAclService()
    ) =>
      aclService.asScoped(request).authorize({
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
      const decisions = await createAclService()
        .asScoped(request)
        .authorize({
          type: 'dashboard',
          spaceId: 'default',
          operation: 'view',
          objects: [{ id: 'dashboard-1', acl: PRIVATE_ACL }],
        });

      expect(decisions.get('dashboard-1')).toEqual({ status: 'allowed' });
      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
    });

    it('allows every object when access control is disabled', async () => {
      asPrincipal(STRANGER);

      const decisions = await authorize('use', PRIVATE_ACL, createAclService({ enabled: false }));

      expect(decisions.get('widget-1')).toEqual({ status: 'allowed' });
      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
      expect(authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
    });

    it('allows the owner and audits only operations from `use` up', async () => {
      const aclService = createAclService();

      await expect(authorize('view', PRIVATE_ACL, aclService)).resolves.toEqual(
        new Map([['widget-1', { status: 'allowed' }]])
      );
      expect(auditLogger.log).not.toHaveBeenCalled();

      await expect(authorize('use', PRIVATE_ACL, aclService)).resolves.toEqual(
        new Map([['widget-1', { status: 'allowed' }]])
      );
      expect(getAuditActions()).toEqual(['access_control_access']);
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
      expect(getAuditActions()).toEqual(['access_control_access']);
    });

    it('masks an object from a stranger as missing and audits the denial once per request', async () => {
      asPrincipal(STRANGER);
      const aclService = createAclService();

      await expect(authorize('view', PRIVATE_ACL, aclService)).resolves.toEqual(
        new Map([['widget-1', { status: 'not_found' }]])
      );
      await expect(authorize('view', PRIVATE_ACL, aclService)).resolves.toEqual(
        new Map([['widget-1', { status: 'not_found' }]])
      );

      expect(getAuditActions()).toEqual(['access_control_denied']);
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
        expect(getAuditActions()).toEqual(['access_control_admin_override']);
      });

      it('reports other operations as forbidden rather than missing', async () => {
        await expect(authorize('use', PRIVATE_ACL)).resolves.toEqual(
          new Map([['widget-1', { status: 'forbidden', operation: 'use' }]])
        );
        expect(getAuditActions()).toEqual(['access_control_denied']);
      });

      it('uses a primed answer instead of a privilege request', async () => {
        const aclService = createAclService();
        aclService.asScoped(request).primeRecovery(TYPE, ['default'], true);

        await expect(authorize('view', PRIVATE_ACL, aclService)).resolves.toEqual(
          new Map([['widget-1', { status: 'allowed' }]])
        );
        expect(authz.checkPrivilegesWithRequest).not.toHaveBeenCalled();
      });
    });

    it('logs a damaged ACL once per object and request', async () => {
      asPrincipal(STRANGER);
      const aclService = createAclService();
      const damagedAcl = createAcl({ version: 2 });

      await aclService.asScoped(request).authorize({
        type: TYPE,
        spaceId: 'default',
        operation: 'view',
        objects: [
          { id: 'widget-1', acl: damagedAcl },
          { id: 'widget-2', acl: damagedAcl },
        ],
      });
      await authorize('view', damagedAcl, aclService);

      expect(logger.warn).toHaveBeenCalledTimes(2);
      expect(logger.warn).toHaveBeenCalledWith(`Invalid ACL on ${TYPE}:widget-1`);
      expect(logger.warn).toHaveBeenCalledWith(`Invalid ACL on ${TYPE}:widget-2`);
    });

    it('sets the principal on audit events of fake requests only', async () => {
      await authorize('use', PRIVATE_ACL);
      expect(auditLogger.log.mock.calls[0][0]).not.toHaveProperty('user');

      // A background task request carries no authenticated user, only its credential.
      request = kibanaRequestFactory({ headers: {}, auth: { isAuthenticated: true } });
      const aclService = createAclService();
      aclService.asScoped(request, { principal: OWNER });
      await authorize('use', PRIVATE_ACL, aclService);

      expect(auditLogger.log.mock.calls[1][0]).toEqual(
        expect.objectContaining({ user: { id: OWNER.id } })
      );
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
        createAclService()
          .asScoped(request)
          .filterVisible({ type: TYPE, spaceId: 'default', objects })
      ).resolves.toEqual([objects[0], objects[2]]);
    });
  });

  describe('#evaluate', () => {
    const evaluate = (acl: CanonicalAcl | undefined, aclService = createAclService()) =>
      aclService.asScoped(request).evaluate({ type: TYPE, spaceId: 'default', acl });

    it('checks feature privileges and recovery in one privilege request', async () => {
      await evaluate(PRIVATE_ACL);

      expect(checkPrivileges.atSpace).toHaveBeenCalledTimes(1);
      expect(checkPrivileges.atSpace).toHaveBeenCalledWith('default', {
        kibana: [...FEATURE_ACTIONS, RECOVERY_ACTION],
      });
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
      const aclService = createAclService();

      const decision = await evaluate(PRIVATE_ACL, aclService);
      expect([...decision.viaRecovery].sort()).toEqual(['manage_access', 'transfer', 'view']);

      checkPrivileges.atSpace.mockClear();
      await aclService.asScoped(request).authorize({
        type: TYPE,
        spaceId: 'default',
        operation: 'view',
        objects: [{ id: 'widget-1', acl: PRIVATE_ACL }],
      });
      expect(checkPrivileges.atSpace).not.toHaveBeenCalled();
    });

    it('ignores recovery when access control is disabled', async () => {
      asPrincipal(STRANGER);
      grantedActions.add(RECOVERY_ACTION);

      const decision = await evaluate(PRIVATE_ACL, createAclService({ enabled: false }));

      expect(decision.viaRecovery.size).toBe(0);
    });
  });

  describe('#getReadFilter', () => {
    it('returns nothing for a type without an access policy or when disabled', async () => {
      await expect(
        createAclService()
          .asScoped(request)
          .getReadFilter({ type: 'dashboard', spaceIds: ['default'] })
      ).resolves.toBeUndefined();
      await expect(
        createAclService({ enabled: false })
          .asScoped(request)
          .getReadFilter({ type: TYPE, spaceIds: ['default'] })
      ).resolves.toBeUndefined();

      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
    });

    it('splits spaces by recovery and audits the override once per type and space', async () => {
      checkPrivileges.atSpace.mockImplementation(async (spaceId: string, { kibana }) => ({
        ...toPrivilegesResponse(spaceId, kibana),
        hasAllRequested: spaceId === 'space-a',
      }));
      const aclService = createAclService();

      const filter = await aclService
        .asScoped(request)
        .getReadFilter({ type: TYPE, spaceIds: ['space-a', 'space-b'] });
      await aclService.asScoped(request).getReadFilter({ type: TYPE, spaceIds: ['space-a'] });

      expect(filter).toEqual(
        buildAclReadFilter({
          policy: POLICY,
          principal: OWNER,
          level: 'view',
          recoverySpaces: ['space-a'],
          ordinarySpaces: ['space-b'],
        })
      );
      expect(getAuditActions()).toEqual(['access_control_admin_override']);
      expect(auditLogger.log).toHaveBeenCalledWith(
        expect.objectContaining({ kibana: { space_id: 'space-a' } })
      );
    });

    it('checks recovery globally for a search across all spaces', async () => {
      await createAclService()
        .asScoped(request)
        .getReadFilter({ type: TYPE, spaceIds: ['*'] });

      expect(checkPrivileges.globally).toHaveBeenCalledWith({ kibana: [RECOVERY_ACTION] });
      expect(checkPrivileges.atSpace).not.toHaveBeenCalled();
    });
  });

  describe('#getInitialAcl', () => {
    it('makes the caller the owner with the requested access', async () => {
      const acl = await createAclService()
        .asScoped(request)
        .getInitialAcl({
          type: TYPE,
          spaceId: 'default',
          requested: { general_access: 'none', entries: [{ ...GRANTEE, access: 'use' }] },
        });

      expect(acl).toEqual({
        version: 1,
        owner: OWNER,
        general_access: 'none',
        entries: [{ ...GRANTEE, access: 'use', added_at: expect.any(String) }],
      });
      expect(userProfiles.bulkGet).toHaveBeenCalledWith({ uids: new Set([GRANTEE.id]) });
    });

    it('returns nothing when disabled and nothing is requested', async () => {
      await expect(
        createAclService({ enabled: false })
          .asScoped(request)
          .getInitialAcl({ type: TYPE, spaceId: 'default' })
      ).resolves.toBeUndefined();
      expect(userProfiles.getCurrentProfileId).not.toHaveBeenCalled();
    });

    it('rejects requested access when disabled', async () => {
      await expect(
        createAclService({ enabled: false })
          .asScoped(request)
          .getInitialAcl({ type: TYPE, spaceId: 'default', requested: { general_access: 'none' } })
      ).rejects.toEqual(new AclChangeError('bad_request', 'Access control is disabled.'));
    });

    it('rejects a type without an access policy', async () => {
      await expect(
        createAclService()
          .asScoped(request)
          .getInitialAcl({ type: 'dashboard', spaceId: 'default' })
      ).rejects.toMatchObject({ code: 'bad_request' });
    });

    it('turns a rejected request into a bad request when validating', async () => {
      userProfiles.bulkGet.mockResolvedValue([]);

      await expect(
        createAclService()
          .asScoped(request)
          .validateInitialAcl({
            type: TYPE,
            spaceId: 'default',
            requested: { entries: [{ ...GRANTEE, access: 'use' }] },
          })
      ).rejects.toMatchObject({
        isBoom: true,
        output: expect.objectContaining({ statusCode: 400 }),
      });
    });
  });

  describe('#authorizeChange', () => {
    const authorizeChange = (
      change: AclChange,
      acl: CanonicalAcl | undefined,
      aclService = createAclService()
    ) =>
      aclService
        .asScoped(request)
        .authorizeChange({ type: TYPE, id: 'widget-1', spaceId: 'default', acl, change });

    it('is rejected when access control is disabled', async () => {
      await expect(
        authorizeChange({ kind: 'claim' }, undefined, createAclService({ enabled: false }))
      ).rejects.toEqual(new AclChangeError('bad_request', 'Access control is disabled.'));
    });

    it('replaces access and audits the change', async () => {
      checkUserProfilesAtSpace.mockResolvedValue({ hasPrivilegeUids: [GRANTEE.id], errorUids: [] });

      const result = await authorizeChange(
        {
          kind: 'replace',
          general_access: 'use',
          entries: [{ ...GRANTEE, access: 'use' }],
        },
        PRIVATE_ACL
      );

      expect(result).toEqual({
        next: {
          version: 1,
          owner: OWNER,
          general_access: 'use',
          entries: [{ ...GRANTEE, access: 'use', added_at: expect.any(String) }],
        },
        warnings: [],
      });
      expect(getAuditActions()).toEqual(['access_control_update']);
      expect(auditLogger.log.mock.calls[0][0]?.message).toBe(
        `User has changed access to ${TYPE} [id=widget-1] (operation: manage_access) ` +
          '(general access: none -> use; entries: none -> user:u_grantee=use)'
      );
    });

    it('claims an object without an owner', async () => {
      const result = await authorizeChange({ kind: 'claim', general_access: 'none' }, undefined);

      expect(result.next).toEqual({
        version: 1,
        owner: OWNER,
        general_access: 'none',
        entries: [],
      });
      expect(getAuditActions()).toEqual(['access_control_transfer']);
    });

    it('transfers ownership and audits the transfer', async () => {
      const result = await authorizeChange({ kind: 'transfer', owner: GRANTEE }, PRIVATE_ACL);

      expect(result.next.owner).toEqual(GRANTEE);
      expect(getAuditActions()).toEqual(['access_control_transfer']);
      expect(auditLogger.log.mock.calls[0][0]?.message).toContain(
        '(owner: user:u_owner -> user:u_grantee)'
      );
    });

    it('audits the override for a change that relied on recovery', async () => {
      asPrincipal(STRANGER);
      grantedActions.add(RECOVERY_ACTION);

      await authorizeChange({ kind: 'transfer', owner: STRANGER }, PRIVATE_ACL);

      expect(getAuditActions()).toEqual([
        'access_control_transfer',
        'access_control_admin_override',
      ]);

      await authorizeChange({ kind: 'replace', general_access: 'edit', entries: [] }, PRIVATE_ACL);
      expect(getAuditActions().slice(2)).toEqual([
        'access_control_update',
        'access_control_admin_override',
      ]);
    });

    it('rejects a change the caller is not allowed to make', async () => {
      asPrincipal(GRANTEE);

      await expect(
        authorizeChange({ kind: 'transfer', owner: GRANTEE }, SHARED_ACL)
      ).rejects.toEqual(expect.objectContaining({ code: 'forbidden' }));
      expect(auditLogger.log).not.toHaveBeenCalled();
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
            general_access: 'none',
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
          general_access: 'none',
          entries: [{ ...GRANTEE, access: 'use' }],
        },
        PRIVATE_ACL
      );

      expect(result.warnings).toEqual([
        { principal: GRANTEE, level: 'use', reason: 'missing_feature_privileges' },
      ]);
      expect(authz.checkUserProfilesPrivileges).toHaveBeenCalledWith(new Set([GRANTEE.id]));
      expect(checkUserProfilesAtSpace).toHaveBeenCalledWith('default', {
        kibana: [VIEW_ACTION, USE_ACTION],
      });
    });
  });
});
