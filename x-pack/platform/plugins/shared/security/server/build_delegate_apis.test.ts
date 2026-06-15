/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core-http-server';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import type {
  AuditLogger,
  CallerSnapshot,
  CoreSecurityDelegateContract,
} from '@kbn/core-security-server';
import type { UserProfileData } from '@kbn/core-user-profile-common';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-server';

import { auditServiceMock } from './audit/mocks';
import { authenticationServiceMock } from './authentication/authentication_service.mock';
import { buildSecurityApi, buildUserProfileApi } from './build_delegate_apis';
import { securityMock } from './mocks';
import { getPrintableSessionId } from './session_management';
import { sessionMock } from './session_management/session.mock';
import { userProfileServiceMock } from './user_profile/user_profile_service.mock';

describe('buildSecurityApi', () => {
  let authc: ReturnType<typeof authenticationServiceMock.createStart>;
  let auditService: ReturnType<typeof auditServiceMock.create>;
  let session: ReturnType<typeof sessionMock.create>;
  let api: CoreSecurityDelegateContract;

  beforeEach(() => {
    authc = authenticationServiceMock.createStart();
    auditService = auditServiceMock.create();
    session = sessionMock.create();
    api = buildSecurityApi({
      getAuthc: () => authc,
      getSession: () => session,
      audit: auditService,
      config: { uiam: { enabled: false } },
    });
  });

  describe('authc.getCurrentUser', () => {
    it('properly delegates to the service', () => {
      const request = httpServerMock.createKibanaRequest();
      api.authc.getCurrentUser(request);

      expect(authc.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(authc.getCurrentUser).toHaveBeenCalledWith(request);
    });

    it('returns the result from the service', async () => {
      const request = httpServerMock.createKibanaRequest();
      const delegateReturn = securityMock.createMockAuthenticatedUser();

      authc.getCurrentUser.mockReturnValue(delegateReturn);

      const currentUser = api.authc.getCurrentUser(request);

      expect(currentUser).toBe(delegateReturn);
    });
  });

  describe('audit.asScoped', () => {
    let auditLogger: AuditLogger;
    it('properly delegates to the service', () => {
      const request = httpServerMock.createKibanaRequest();
      auditLogger = api.audit.asScoped(request);
      auditLogger.log({ message: 'an event' });
      expect(auditService.asScoped).toHaveBeenCalledTimes(1);
      expect(auditService.asScoped).toHaveBeenCalledWith(request);
    });

    it('returns the result from the service', async () => {
      const request = httpServerMock.createKibanaRequest();
      auditLogger = api.audit.asScoped(request);
      auditLogger.log({ message: 'an event' });
      expect(auditService.asScoped(request).log).toHaveBeenCalledTimes(1);
      expect(auditService.asScoped(request).log).toHaveBeenCalledWith({ message: 'an event' });
    });
  });

  describe('authc.apiKeys', () => {
    it('properly delegates to the service', async () => {
      await authc.apiKeys.areAPIKeysEnabled();
      expect(authc.apiKeys.areAPIKeysEnabled).toHaveBeenCalledTimes(1);
    });

    it('returns the result from the service', async () => {
      authc.apiKeys.areAPIKeysEnabled.mockReturnValue(Promise.resolve(false));

      const areAPIKeysEnabled = await authc.apiKeys.areAPIKeysEnabled();

      expect(areAPIKeysEnabled).toBe(false);
    });
  });

  describe('authc.getRedactedSessionId', () => {
    it('properly delegates to session.getSID and redacts the result', async () => {
      const request = httpServerMock.createKibanaRequest();
      const fullSid = '1234567890abcdefghijklmno';
      session.getSID.mockResolvedValue(fullSid);

      const result = await api.authc.getRedactedSessionId(request);

      expect(session.getSID).toHaveBeenCalledTimes(1);
      expect(session.getSID).toHaveBeenCalledWith(request);
      expect(result).toBe(getPrintableSessionId(fullSid));
    });

    it('returns undefined when session.getSID resolves to undefined', async () => {
      const request = httpServerMock.createKibanaRequest();
      session.getSID.mockResolvedValue(undefined);

      const result = await api.authc.getRedactedSessionId(request);

      expect(result).toBeUndefined();
    });
  });

  describe('authc.captureCaller / authc.replayCaller / authc.stampCaller / authc.adoptPersistedCaller', () => {
    // `captureCaller` reads `request.fakeRawRequest?.spaceId` directly (it does NOT
    // use the public `KibanaRequest.spaceId` field). This shim mirrors that exact access
    // path so the tests exercise the production code path without depending on internal
    // details of `kibanaRequestFactory`.
    const buildCaptureInput = (overrides: {
      authorization?: string;
      spaceId?: string;
    }): KibanaRequest => {
      const headers = overrides.authorization ? { authorization: overrides.authorization } : {};
      return {
        headers,
        fakeRawRequest: overrides.spaceId ? { spaceId: overrides.spaceId } : undefined,
      } as unknown as KibanaRequest;
    };

    describe('captureCaller', () => {
      it('returns undefined when the request has no authorization, no spaceId, and no resolved profile', async () => {
        authc.getCurrentUser.mockReturnValue(null);
        const request = httpServerMock.createKibanaRequest();

        await expect(api.authc.captureCaller(request)).resolves.toBeUndefined();
      });

      it('returns a v:1 snapshot with authorization only when only auth is set', async () => {
        authc.getCurrentUser.mockReturnValue(null);
        const request = buildCaptureInput({ authorization: 'ApiKey abc' });

        const snapshot = (await api.authc.captureCaller(request)) as unknown as Record<
          string,
          unknown
        >;

        expect(snapshot).toEqual({ v: 1, authorization: 'ApiKey abc' });
      });

      it('returns a v:1 snapshot with authorization and spaceId when both are set', async () => {
        authc.getCurrentUser.mockReturnValue(null);
        const request = buildCaptureInput({ authorization: 'ApiKey abc', spaceId: 'marketing' });

        const snapshot = (await api.authc.captureCaller(request)) as unknown as Record<
          string,
          unknown
        >;

        expect(snapshot).toEqual({ v: 1, authorization: 'ApiKey abc', spaceId: 'marketing' });
      });

      it('includes userProfileId when getCurrentUser resolves a profile_uid', async () => {
        authc.getCurrentUser.mockReturnValue(
          securityMock.createMockAuthenticatedUser({ profile_uid: 'uid-abc-123' })
        );
        const request = buildCaptureInput({ authorization: 'ApiKey abc' });

        const snapshot = (await api.authc.captureCaller(request)) as unknown as Record<
          string,
          unknown
        >;

        expect(snapshot).toEqual({
          v: 1,
          authorization: 'ApiKey abc',
          userProfileId: 'uid-abc-123',
        });
      });

      it('omits userProfileId when getCurrentUser returns null', async () => {
        authc.getCurrentUser.mockReturnValue(null);
        const request = buildCaptureInput({ authorization: 'ApiKey abc' });

        const snapshot = (await api.authc.captureCaller(request)) as unknown as Record<
          string,
          unknown
        >;

        expect(snapshot).not.toHaveProperty('userProfileId');
      });

      it('omits userProfileId when getCurrentUser throws (best-effort)', async () => {
        authc.getCurrentUser.mockImplementation(() => {
          throw new Error('auth failure');
        });
        const request = buildCaptureInput({ authorization: 'ApiKey abc' });

        const snapshot = (await api.authc.captureCaller(request)) as unknown as Record<
          string,
          unknown
        >;

        expect(snapshot).not.toHaveProperty('userProfileId');
      });

      it('returns a snapshot with only userProfileId when no auth and no spaceId but profile resolves', async () => {
        authc.getCurrentUser.mockReturnValue(
          securityMock.createMockAuthenticatedUser({ profile_uid: 'uid-only' })
        );
        const request = buildCaptureInput({});

        const snapshot = (await api.authc.captureCaller(request)) as unknown as Record<
          string,
          unknown
        >;

        expect(snapshot).toEqual({ v: 1, userProfileId: 'uid-only' });
      });
    });

    describe('replayCaller', () => {
      it('returns undefined for a snapshot with unknown v', () => {
        const snapshot = { v: 2, authorization: 'ApiKey abc' } as unknown as CallerSnapshot;

        expect(api.authc.replayCaller(snapshot)).toBeUndefined();
      });

      it('returns undefined when snapshot is missing v entirely', () => {
        const snapshot = api.authc.adoptPersistedCaller({
          authorization: 'ApiKey abc',
        });
        // adoptPersistedCaller requires numeric v — without it, returns undefined
        expect(snapshot).toBeUndefined();
      });

      it('returns undefined for v1 snapshot without authorization', () => {
        const snapshot = { v: 1, spaceId: 'marketing' } as unknown as CallerSnapshot;

        expect(api.authc.replayCaller(snapshot)).toBeUndefined();
      });

      it('rebuilds a KibanaRequest with the persisted authorization header', () => {
        const snapshot = { v: 1, authorization: 'ApiKey abc' } as unknown as CallerSnapshot;

        const replayed = api.authc.replayCaller(snapshot);

        expect(replayed).toBeDefined();
        expect(replayed!.headers.authorization).toBe('ApiKey abc');
      });

      it('rebuilds a KibanaRequest with the persisted spaceId', () => {
        const snapshot = {
          v: 1,
          authorization: 'ApiKey abc',
          spaceId: 'marketing',
        } as unknown as CallerSnapshot;

        const replayed = api.authc.replayCaller(snapshot);

        expect(replayed).toBeDefined();
        expect(replayed!.spaceId).toBe('marketing');
      });
    });

    describe('stampCaller', () => {
      it('returns undefined when all parts are empty', () => {
        expect(api.authc.stampCaller({})).toBeUndefined();
      });

      it('mints a v:1 snapshot with provided fields, omitting absent ones', () => {
        const snapshot = api.authc.stampCaller({
          authorization: 'Bearer tok',
          spaceId: 'sales',
        }) as unknown as Record<string, unknown> | undefined;

        expect(snapshot).toEqual({ v: 1, authorization: 'Bearer tok', spaceId: 'sales' });
      });

      it('round-trips through replayCaller', () => {
        const snapshot = api.authc.stampCaller({
          authorization: 'ApiKey abc',
          spaceId: 'marketing',
        });
        expect(snapshot).toBeDefined();

        const replayed = api.authc.replayCaller(snapshot!);
        expect(replayed).toBeDefined();
        expect(replayed!.headers.authorization).toBe('ApiKey abc');
        expect(replayed!.spaceId).toBe('marketing');
      });
    });

    describe('adoptPersistedCaller', () => {
      it('returns undefined for null', () => {
        expect(api.authc.adoptPersistedCaller(null)).toBeUndefined();
      });

      it('returns undefined for non-objects', () => {
        expect(api.authc.adoptPersistedCaller('string')).toBeUndefined();
        expect(api.authc.adoptPersistedCaller(42)).toBeUndefined();
        expect(api.authc.adoptPersistedCaller(undefined)).toBeUndefined();
      });

      it('returns undefined when v is missing', () => {
        expect(api.authc.adoptPersistedCaller({ authorization: 'ApiKey abc' })).toBeUndefined();
      });

      it('returns undefined when v is not a number', () => {
        expect(
          api.authc.adoptPersistedCaller({ v: '1', authorization: 'ApiKey abc' })
        ).toBeUndefined();
      });

      it('returns the value brand-cast for an object with numeric v', () => {
        const persisted = { v: 1, authorization: 'ApiKey abc', spaceId: 'sales' };
        const snapshot = api.authc.adoptPersistedCaller(persisted);

        expect(snapshot).toBeDefined();
        expect(snapshot).toBe(persisted);
      });

      it('the returned value can be passed to replayCaller without further casts', () => {
        const persisted = { v: 1, authorization: 'ApiKey abc' };
        const snapshot = api.authc.adoptPersistedCaller(persisted);
        expect(snapshot).toBeDefined();

        const replayed = api.authc.replayCaller(snapshot!);
        expect(replayed).toBeDefined();
        expect(replayed!.headers.authorization).toBe('ApiKey abc');
      });
    });

    describe('round-trip', () => {
      it('captureCaller -> replayCaller reproduces authorization and spaceId', async () => {
        authc.getCurrentUser.mockReturnValue(null);
        const source = buildCaptureInput({
          authorization: 'ApiKey abc',
          spaceId: 'marketing',
        });

        const snapshot = await api.authc.captureCaller(source);
        expect(snapshot).toBeDefined();

        const replayed = api.authc.replayCaller(snapshot!);
        expect(replayed).toBeDefined();
        expect(replayed!.headers.authorization).toBe('ApiKey abc');
        expect(replayed!.spaceId).toBe('marketing');
      });
    });
  });

  describe('config.uiam', () => {
    describe('when uiam is enabled', () => {
      beforeEach(() => {
        authc = authenticationServiceMock.createStart();
        auditService = auditServiceMock.create();
        session = sessionMock.create();
        api = buildSecurityApi({
          getAuthc: () => authc,
          getSession: () => session,
          audit: auditService,
          config: { uiam: { enabled: true } },
        });
      });

      it('should expose the uiam API', () => {
        expect(api.authc.apiKeys.uiam).not.toBeNull();
        expect(api.authc.apiKeys.uiam).toBeDefined();
      });

      it('should properly delegate grant to the service', async () => {
        const request = httpServerMock.createKibanaRequest();
        const grantParams = {
          name: 'test-key',
          expiration: '1d',
        };

        await api.authc.apiKeys.uiam!.grant(request, grantParams);

        expect(authc.apiKeys.uiam!.grant).toHaveBeenCalledTimes(1);
        expect(authc.apiKeys.uiam!.grant).toHaveBeenCalledWith(request, grantParams);
      });

      it('should properly delegate invalidate to the service', async () => {
        const request = httpServerMock.createKibanaRequest();
        const invalidateParams = {
          id: 'key-id-1',
        };

        await api.authc.apiKeys.uiam!.invalidate(request, invalidateParams);

        expect(authc.apiKeys.uiam!.invalidate).toHaveBeenCalledTimes(1);
        expect(authc.apiKeys.uiam!.invalidate).toHaveBeenCalledWith(request, invalidateParams);
      });
    });

    describe('when uiam is disabled', () => {
      beforeEach(() => {
        authc = authenticationServiceMock.createStart();
        auditService = auditServiceMock.create();
        session = sessionMock.create();
        api = buildSecurityApi({
          getAuthc: () => authc,
          getSession: () => session,
          audit: auditService,
          config: { uiam: { enabled: false } },
        });
      });

      it('should set uiam to null', () => {
        expect(api.authc.apiKeys.uiam).toBeNull();
      });
    });

    describe('when uiam config is not provided', () => {
      beforeEach(() => {
        authc = authenticationServiceMock.createStart();
        auditService = auditServiceMock.create();
        session = sessionMock.create();
        api = buildSecurityApi({
          getAuthc: () => authc,
          getSession: () => session,
          audit: auditService,
          config: {},
        });
      });

      it('should set uiam to null', () => {
        expect(api.authc.apiKeys.uiam).toBeNull();
      });
    });
  });
});

describe('buildUserProfileApi', () => {
  let userProfile: ReturnType<typeof userProfileServiceMock.createStart>;
  let api: CoreUserProfileDelegateContract;

  beforeEach(() => {
    userProfile = userProfileServiceMock.createStart();
    api = buildUserProfileApi({ getUserProfile: () => userProfile });
  });

  describe('getCurrent', () => {
    it('properly delegates to the service', async () => {
      const request = httpServerMock.createKibanaRequest();
      await api.getCurrent({ request, dataPath: 'dataPath' });

      expect(userProfile.getCurrent).toHaveBeenCalledTimes(1);
      expect(userProfile.getCurrent).toHaveBeenCalledWith({ request, dataPath: 'dataPath' });
    });

    it('returns the result from the service', async () => {
      const request = httpServerMock.createKibanaRequest();

      userProfile.getCurrent.mockResolvedValue(null);

      const returnValue = await api.getCurrent({ request, dataPath: 'dataPath' });

      expect(returnValue).toBe(null);
    });
  });

  describe('bulkGet', () => {
    it('properly delegates to the service', async () => {
      const uids = new Set(['foo', 'bar']);
      await api.bulkGet({ uids, dataPath: 'dataPath' });

      expect(userProfile.bulkGet).toHaveBeenCalledTimes(1);
      expect(userProfile.bulkGet).toHaveBeenCalledWith({ uids, dataPath: 'dataPath' });
    });

    it('returns the result from the service', async () => {
      userProfile.bulkGet.mockResolvedValue([]);

      const returnValue = await api.bulkGet({ uids: new Set(), dataPath: 'dataPath' });

      expect(returnValue).toEqual([]);
    });
  });

  describe('suggest', () => {
    it('properly delegates to the service', async () => {
      await api.suggest({ name: 'foo' });

      expect(userProfile.suggest).toHaveBeenCalledTimes(1);
      expect(userProfile.suggest).toHaveBeenCalledWith({ name: 'foo' });
    });

    it('returns the result from the service', async () => {
      userProfile.suggest.mockResolvedValue([]);

      const returnValue = await api.suggest({ name: 'foo' });

      expect(returnValue).toEqual([]);
    });
  });

  describe('update', () => {
    it('properly delegates to the service', async () => {
      const updated = { foo: 'bar' };
      await api.update('foo', updated as unknown as UserProfileData);

      expect(userProfile.update).toHaveBeenCalledTimes(1);
      expect(userProfile.update).toHaveBeenCalledWith('foo', updated);
    });
  });
});
