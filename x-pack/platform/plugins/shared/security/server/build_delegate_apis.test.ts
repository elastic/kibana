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
  CoreSecurityDelegateContract,
  OpaqueRequestState,
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

  describe('authc.serializeRequest / authc.hydrateRequest', () => {
    // `serializeRequest` reads `request.fakeRawRequest?.spaceId` directly (it does NOT
    // use the public `KibanaRequest.spaceId` field). This shim mirrors that exact access
    // path so the tests exercise the production code path without depending on internal
    // details of `kibanaRequestFactory`.
    const buildSerializeInput = (overrides: {
      authorization?: string;
      spaceId?: string;
    }): KibanaRequest => {
      const headers = overrides.authorization ? { authorization: overrides.authorization } : {};
      return {
        headers,
        fakeRawRequest: overrides.spaceId ? { spaceId: overrides.spaceId } : undefined,
      } as unknown as KibanaRequest;
    };

    describe('serializeRequest', () => {
      it('returns undefined when the request has no authorization header and no spaceId', () => {
        const request = httpServerMock.createKibanaRequest();

        expect(api.authc.serializeRequest(request)).toBeUndefined();
      });

      it('captures the authorization header and stamps the v1 envelope', () => {
        const request = buildSerializeInput({ authorization: 'ApiKey abc' });

        const state = api.authc.serializeRequest(request) as Record<string, unknown> | undefined;

        expect(state).toEqual({ v: 1, authorization: 'ApiKey abc' });
      });

      it('captures the spaceId from fakeRawRequest when present', () => {
        const request = buildSerializeInput({ authorization: 'ApiKey abc', spaceId: 'marketing' });

        const state = api.authc.serializeRequest(request) as Record<string, unknown> | undefined;

        expect(state).toEqual({ v: 1, authorization: 'ApiKey abc', spaceId: 'marketing' });
      });

      it('captures spaceId alone when no authorization header is present', () => {
        const request = buildSerializeInput({ spaceId: 'marketing' });

        const state = api.authc.serializeRequest(request) as Record<string, unknown> | undefined;

        expect(state).toEqual({ v: 1, spaceId: 'marketing' });
      });
    });

    describe('hydrateRequest', () => {
      it('returns undefined for an unknown envelope version (no fabricated request)', () => {
        const state = { v: 2, authorization: 'ApiKey abc' } as unknown as OpaqueRequestState;

        expect(api.authc.hydrateRequest(state)).toBeUndefined();
      });

      it('returns undefined when the envelope version marker is missing entirely', () => {
        // Defensive: any persisted shape without `v` cannot be safely rehydrated by this
        // producer, so the hydrator must refuse rather than fabricate a request.
        const state = { authorization: 'ApiKey abc' } as unknown as OpaqueRequestState;

        expect(api.authc.hydrateRequest(state)).toBeUndefined();
      });

      it('returns undefined for a v1 envelope without an authorization header', () => {
        const state = { v: 1, spaceId: 'marketing' } as unknown as OpaqueRequestState;

        expect(api.authc.hydrateRequest(state)).toBeUndefined();
      });

      it('rebuilds a KibanaRequest with the persisted authorization header from a v1 envelope', () => {
        const state = { v: 1, authorization: 'ApiKey abc' } as unknown as OpaqueRequestState;

        const hydrated = api.authc.hydrateRequest(state);

        expect(hydrated).toBeDefined();
        expect(hydrated!.headers.authorization).toBe('ApiKey abc');
      });

      it('exposes spaceId on the rehydrated KibanaRequest when present in a v1 envelope', () => {
        const state = {
          v: 1,
          authorization: 'ApiKey abc',
          spaceId: 'marketing',
        } as unknown as OpaqueRequestState;

        const hydrated = api.authc.hydrateRequest(state);

        expect(hydrated).toBeDefined();
        expect(hydrated!.spaceId).toBe('marketing');
      });

      it('ignores additive unknown keys inside a known v1 envelope (forward-compat)', () => {
        // A newer producer may add additive identity hints (e.g. profile_uid) inside
        // the same `v: 1` shape. The hydrator must not reject the bag because of them.
        const state = {
          v: 1,
          authorization: 'ApiKey abc',
          spaceId: 'marketing',
          futureHint: 'profile-uid-123',
        } as unknown as OpaqueRequestState;

        const hydrated = api.authc.hydrateRequest(state);

        expect(hydrated).toBeDefined();
        expect(hydrated!.headers.authorization).toBe('ApiKey abc');
      });
    });

    describe('round-trip', () => {
      it('serializeRequest -> hydrateRequest reproduces authorization and spaceId', () => {
        const source = buildSerializeInput({
          authorization: 'ApiKey abc',
          spaceId: 'marketing',
        });

        const state = api.authc.serializeRequest(source);
        expect(state).toBeDefined();

        const hydrated = api.authc.hydrateRequest(state!);
        expect(hydrated).toBeDefined();
        expect(hydrated!.headers.authorization).toBe('ApiKey abc');
        expect(hydrated!.spaceId).toBe('marketing');
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
