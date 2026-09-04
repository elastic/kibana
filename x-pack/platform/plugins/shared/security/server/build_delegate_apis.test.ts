/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { AuditLogger, CoreSecurityDelegateContract } from '@kbn/core-security-server';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { UserProfileData } from '@kbn/core-user-profile-common';
import type { CoreUserProfileDelegateContract } from '@kbn/core-user-profile-server';

import { auditServiceMock } from './audit/mocks';
import { authenticationServiceMock } from './authentication/authentication_service.mock';
import { buildSecurityApi, buildUserProfileApi } from './build_delegate_apis';
import { securityMock } from './mocks';
import { serviceAccountsServiceMock } from './service_accounts/service_accounts_service.mock';
import { getPrintableSessionId } from './session_management';
import { sessionMock } from './session_management/session.mock';
import { userProfileServiceMock } from './user_profile/user_profile_service.mock';

describe('buildSecurityApi', () => {
  let authc: ReturnType<typeof authenticationServiceMock.createStart>;
  let auditService: ReturnType<typeof auditServiceMock.create>;
  let session: ReturnType<typeof sessionMock.create>;
  let serviceAccounts: ReturnType<typeof serviceAccountsServiceMock.createStart> | null;
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;
  let api: CoreSecurityDelegateContract;

  beforeEach(() => {
    authc = authenticationServiceMock.createStart();
    auditService = auditServiceMock.create();
    session = sessionMock.create();
    serviceAccounts = serviceAccountsServiceMock.createStart();
    logger = loggingSystemMock.createLogger();
    api = buildSecurityApi({
      getAuthc: () => authc,
      getSession: () => session,
      getServiceAccounts: () => serviceAccounts,
      audit: auditService,
      config: { uiam: { enabled: false } },
      logger,
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

    it('returns the enriched override for fake requests when the enricher has bound a profile', () => {
      const request = httpServerMock.createFakeKibanaRequest({});

      api.fakeRequestEnricher(request, { profileId: 'u_test_profile_123', username: 'jdoe' });

      const user = api.authc.getCurrentUser(request);

      expect(authc.getCurrentUser).not.toHaveBeenCalled();
      expect(user!.profile_uid).toBe('u_test_profile_123');
      expect(user!.username).toBe('jdoe');
    });

    it('falls back to the authentication service for fake requests without an enrichment', () => {
      const request = httpServerMock.createFakeKibanaRequest({});
      const delegateReturn = securityMock.createMockAuthenticatedUser();
      authc.getCurrentUser.mockReturnValue(delegateReturn);

      const user = api.authc.getCurrentUser(request);

      expect(authc.getCurrentUser).toHaveBeenCalledTimes(1);
      expect(authc.getCurrentUser).toHaveBeenCalledWith(request);
      expect(user).toBe(delegateReturn);
    });
  });

  describe('fakeRequestEnricher', () => {
    it('binds a profile_uid and username that are then surfaced via getCurrentUser', () => {
      const request = httpServerMock.createFakeKibanaRequest({});

      api.fakeRequestEnricher(request, { profileId: 'u_test_profile_123', username: 'jdoe' });

      const user = api.authc.getCurrentUser(request);
      expect(user!.profile_uid).toBe('u_test_profile_123');
      expect(user!.username).toBe('jdoe');
    });

    it('throws when called on a real (non-fake) request', () => {
      const request = httpServerMock.createKibanaRequest();
      expect(() => api.fakeRequestEnricher(request, { profileId: 'u_test_profile_123' })).toThrow(
        /must only be called on a fake request/
      );
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

  describe('serviceAccounts.isEnabled', () => {
    const buildApiWithConfig = (config: Parameters<typeof buildSecurityApi>[0]['config']) =>
      buildSecurityApi({
        getAuthc: () => authc,
        getSession: () => session,
        getServiceAccounts: () => serviceAccounts,
        audit: auditService,
        config,
        logger,
      });

    it('returns true when service accounts are enabled', () => {
      expect(
        buildApiWithConfig({ serviceAccounts: { enabled: true } }).serviceAccounts.isEnabled()
      ).toBe(true);
    });

    it('returns false when service accounts are disabled', () => {
      expect(
        buildApiWithConfig({ serviceAccounts: { enabled: false } }).serviceAccounts.isEnabled()
      ).toBe(false);
    });

    it('returns false when the setting is not available, as is the case outside of serverless', () => {
      expect(buildApiWithConfig({}).serviceAccounts.isEnabled()).toBe(false);
    });
  });

  describe('serviceAccounts.create', () => {
    const params = { name: 'nightshift-relay' };

    it('resolves the service lazily rather than at build time', () => {
      const getServiceAccounts = jest.fn().mockReturnValue(serviceAccounts);

      buildSecurityApi({
        getAuthc: () => authc,
        getSession: () => session,
        getServiceAccounts,
        audit: auditService,
        config: {},
        logger,
      });

      expect(getServiceAccounts).not.toHaveBeenCalled();
    });

    it('properly delegates to the service', async () => {
      const request = httpServerMock.createKibanaRequest();

      await api.serviceAccounts.create(request, params);

      expect(serviceAccounts!.create).toHaveBeenCalledTimes(1);
      expect(serviceAccounts!.create).toHaveBeenCalledWith(request, params);
    });

    it('returns the result from the service', async () => {
      const created = {
        id: 'service-account-id',
        type: 'project' as const,
        name: 'nightshift-relay',
        organization_id: 'organization-id',
        role_assignments: {},
        assumable_by: [],
      };
      serviceAccounts!.create.mockResolvedValue(created);

      await expect(
        api.serviceAccounts.create(httpServerMock.createKibanaRequest(), params)
      ).resolves.toBe(created);
    });

    it('throws when service accounts are not enabled', async () => {
      serviceAccounts = null;

      await expect(
        api.serviceAccounts.create(httpServerMock.createKibanaRequest(), params)
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Service accounts are not enabled"`);
    });
  });

  // POC ONLY — see CoreServiceAccountsService.exchangeToken for the full rationale.
  describe('serviceAccounts.exchangeToken', () => {
    it('properly delegates to the service', async () => {
      await api.serviceAccounts.exchangeToken('service-account-id');

      expect(serviceAccounts!.exchangeToken).toHaveBeenCalledTimes(1);
      expect(serviceAccounts!.exchangeToken).toHaveBeenCalledWith('service-account-id');
    });

    it('returns the result from the service', async () => {
      serviceAccounts!.exchangeToken.mockResolvedValue({ token: 'essu_new_token' });

      await expect(api.serviceAccounts.exchangeToken('service-account-id')).resolves.toEqual({
        token: 'essu_new_token',
      });
    });

    it('throws when service accounts are not enabled', async () => {
      serviceAccounts = null;

      await expect(
        api.serviceAccounts.exchangeToken('service-account-id')
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"Service accounts are not enabled"`);
    });
  });

  describe('workload bindings', () => {
    const WORKLOAD = { workloadType: 'rule', workloadId: 'rule-id' };

    it('delegates attach, forwarding the operation type Core supplied', async () => {
      const request = httpServerMock.createKibanaRequest();
      const params = { serviceAccountId: 'service-account-id', ...WORKLOAD };

      await api.serviceAccounts.attachWorkload('alerting_rule', request, params);

      expect(serviceAccounts!.workloads.attach).toHaveBeenCalledWith(
        'alerting_rule',
        request,
        params
      );
    });

    it('delegates detach', async () => {
      const request = httpServerMock.createKibanaRequest();

      await api.serviceAccounts.detachWorkload('alerting_rule', request, WORKLOAD);

      expect(serviceAccounts!.workloads.detach).toHaveBeenCalledWith(
        'alerting_rule',
        request,
        WORKLOAD
      );
    });

    it('delegates getBinding and returns its result', async () => {
      const binding = { operationType: 'alerting_rule' } as never;
      serviceAccounts!.workloads.getBinding.mockResolvedValue(binding);

      await expect(api.serviceAccounts.getWorkloadBinding('alerting_rule', WORKLOAD)).resolves.toBe(
        binding
      );
      expect(serviceAccounts!.workloads.getBinding).toHaveBeenCalledWith('alerting_rule', WORKLOAD);
    });

    it('delegates withScopedRequest, passing the callback through', async () => {
      const fn = jest.fn();

      await api.serviceAccounts.withScopedRequestForWorkload('alerting_rule', WORKLOAD, fn);

      expect(serviceAccounts!.workloads.withScopedRequest).toHaveBeenCalledWith(
        'alerting_rule',
        WORKLOAD,
        fn
      );
    });

    it.each([
      [
        'attachWorkload',
        () =>
          api.serviceAccounts.attachWorkload(
            'alerting_rule',
            httpServerMock.createKibanaRequest(),
            {
              serviceAccountId: 'sa',
              ...WORKLOAD,
            }
          ),
      ],
      [
        'detachWorkload',
        () =>
          api.serviceAccounts.detachWorkload(
            'alerting_rule',
            httpServerMock.createKibanaRequest(),
            WORKLOAD
          ),
      ],
      [
        'getWorkloadBinding',
        () => api.serviceAccounts.getWorkloadBinding('alerting_rule', WORKLOAD),
      ],
      [
        'withScopedRequestForWorkload',
        () =>
          api.serviceAccounts.withScopedRequestForWorkload('alerting_rule', WORKLOAD, jest.fn()),
      ],
    ])('rejects %s when service accounts are not enabled', async (_name, invoke) => {
      serviceAccounts = null;

      await expect(invoke()).rejects.toThrowErrorMatchingInlineSnapshot(
        `"Service accounts are not enabled"`
      );
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
          getServiceAccounts: () => serviceAccounts,
          audit: auditService,
          config: { uiam: { enabled: true } },
          logger,
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

      it('should properly delegate getInternalCallerAttestationHeaders to the service', () => {
        const attestationHeaders = { 'x-some-attestation': 'some-attestation' };
        jest
          .mocked(authc.apiKeys.uiam!.getInternalCallerAttestationHeaders)
          .mockReturnValue(attestationHeaders);

        const credential = new HTTPAuthorizationHeader('Bearer', 'essu_one');
        expect(api.authc.apiKeys.uiam!.getInternalCallerAttestationHeaders(credential)).toBe(
          attestationHeaders
        );
        expect(authc.apiKeys.uiam!.getInternalCallerAttestationHeaders).toHaveBeenCalledTimes(1);
        expect(authc.apiKeys.uiam!.getInternalCallerAttestationHeaders).toHaveBeenCalledWith(
          credential
        );
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
          getServiceAccounts: () => serviceAccounts,
          audit: auditService,
          config: { uiam: { enabled: false } },
          logger,
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
          getServiceAccounts: () => serviceAccounts,
          audit: auditService,
          config: {},
          logger,
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

  describe('getCurrentProfileId', () => {
    it('properly delegates to the service', async () => {
      const request = httpServerMock.createKibanaRequest();
      await api.getCurrentProfileId({ request });

      expect(userProfile.getCurrentProfileId).toHaveBeenCalledTimes(1);
      expect(userProfile.getCurrentProfileId).toHaveBeenCalledWith({ request });
    });

    it('returns the result from the service', async () => {
      const request = httpServerMock.createKibanaRequest();

      userProfile.getCurrentProfileId.mockResolvedValue('some-uid');

      const returnValue = await api.getCurrentProfileId({ request });

      expect(returnValue).toBe('some-uid');
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
