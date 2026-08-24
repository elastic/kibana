/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest, ServiceAccount } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { Logger } from '@kbn/logging';
import type {
  CheckPrivileges,
  CheckPrivilegesResponse,
  CheckPrivilegesWithRequest,
} from '@kbn/security-plugin-types-server';

import { SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS } from './fake_requests';
import { UiamServiceAccounts } from './uiam_service_accounts';
import type { SecurityLicense } from '../../common';
import { licenseMock } from '../../common/licensing/index.mock';
import type { UiamServicePublic } from '../uiam';
import { uiamServiceMock } from '../uiam/uiam_service.mock';

describe('UiamServiceAccounts', () => {
  let serviceAccounts: UiamServiceAccounts;
  let mockLicense: jest.Mocked<SecurityLicense>;
  let mockUiam: jest.Mocked<UiamServicePublic>;
  let mockCheckPrivileges: jest.Mocked<CheckPrivileges>;
  let mockCheckPrivilegesWithRequest: jest.Mocked<CheckPrivilegesWithRequest>;
  let logger: Logger;

  const clusterPrivilegesResponse = (authorized: boolean): CheckPrivilegesResponse => ({
    hasAllRequested: authorized,
    username: 'elastic',
    privileges: {
      kibana: [],
      elasticsearch: { cluster: [{ privilege: 'manage_security', authorized }], index: {} },
    },
  });

  const createParams = { name: 'nightshift-relay' };

  const createMockRequest = (authHeader?: string): KibanaRequest =>
    httpServerMock.createKibanaRequest({
      headers: authHeader ? { authorization: authHeader } : {},
    });

  const validResponse: ServiceAccount = {
    id: 'service-account-id',
    type: 'project' as const,
    name: 'nightshift-relay',
    organization_id: 'organization-id',
    role_assignments: { limit: { access: ['application'], resource: ['project'] } },
    assumable_by: [
      {
        type: 'project-service-account' as const,
        organization_id: 'organization-id',
        project_type: 'security',
        project_id: 'project-id',
      },
    ],
  };

  beforeEach(() => {
    mockLicense = licenseMock.create();
    mockLicense.isEnabled.mockReturnValue(true);
    logger = loggingSystemMock.create().get('service-accounts');
    mockUiam = uiamServiceMock.create();
    mockCheckPrivileges = {
      atSpace: jest.fn(),
      atSpaces: jest.fn(),
      globally: jest.fn().mockResolvedValue(clusterPrivilegesResponse(true)),
    };
    mockCheckPrivilegesWithRequest = jest.fn().mockReturnValue(mockCheckPrivileges);

    serviceAccounts = new UiamServiceAccounts({
      logger,
      license: mockLicense,
      uiam: mockUiam,
      checkPrivilegesWithRequest: mockCheckPrivilegesWithRequest,
      organizationId: 'organization-id',
      projectId: 'project-id',
      projectType: 'security',
    });
  });

  describe('#create', () => {
    it('forwards the caller access token, the fixed `role_assignments` and the derived `assumable_by`', async () => {
      mockUiam.createServiceAccount.mockResolvedValue(validResponse);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).resolves.toEqual(validResponse);

      expect(mockUiam.createServiceAccount).toHaveBeenCalledTimes(1);
      expect(mockUiam.createServiceAccount).toHaveBeenCalledWith('essu_my_token', {
        name: 'nightshift-relay',
        role_assignments: { limit: { access: ['application'], resource: ['project'] } },
        assumable_by: [
          {
            type: 'project-service-account',
            organization_id: 'organization-id',
            project_type: 'security',
            project_id: 'project-id',
          },
        ],
      });
    });

    it('rejects with a 403 when security features are disabled in Elasticsearch', async () => {
      mockLicense.isEnabled.mockReturnValue(false);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(mockUiam.createServiceAccount).not.toHaveBeenCalled();
    });

    it('rejects with a 401 when the request carries no authorization header', async () => {
      await expect(serviceAccounts.create(createMockRequest(), createParams)).rejects.toMatchObject(
        { output: { statusCode: 401 } }
      );

      expect(mockUiam.createServiceAccount).not.toHaveBeenCalled();
    });

    it('rejects with a 400 when the credential is not a UIAM credential', async () => {
      await expect(
        serviceAccounts.create(createMockRequest('ApiKey abcdef'), createParams)
      ).rejects.toMatchObject({ output: { statusCode: 400 } });

      expect(mockUiam.createServiceAccount).not.toHaveBeenCalled();
    });

    it('checks the `manage_security` cluster privilege for the caller', async () => {
      mockUiam.createServiceAccount.mockResolvedValue(validResponse);
      const request = createMockRequest('Bearer essu_my_token');

      await serviceAccounts.create(request, createParams);

      expect(mockCheckPrivilegesWithRequest).toHaveBeenCalledWith(request);
      expect(mockCheckPrivileges.globally).toHaveBeenCalledWith({
        elasticsearch: { cluster: ['manage_security'], index: {} },
      });
    });

    it('rejects with a 403 when the caller lacks the `manage_security` cluster privilege', async () => {
      mockCheckPrivileges.globally.mockResolvedValue(clusterPrivilegesResponse(false));

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).rejects.toMatchObject({ output: { statusCode: 403 } });

      expect(mockUiam.createServiceAccount).not.toHaveBeenCalled();
    });

    // Validating the response means a mismatch fails loudly rather than leaking undefined fields
    // to consumers.
    it('rejects when the upstream response does not match the expected shape', async () => {
      mockUiam.createServiceAccount.mockResolvedValue({ id: 'service-account-id' } as never);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).rejects.toThrowError('Error occured during service account creation');
    });

    it('rejects when an `assumable_by` entry does not match the expected shape', async () => {
      mockUiam.createServiceAccount.mockResolvedValue({
        ...validResponse,
        assumable_by: [{ type: 'project-service-account' }],
      } as never);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).rejects.toThrowError('Error occured during service account creation');
    });

    // Consumers only ever see documented fields, so a field UIAM adds later cannot silently become
    // part of Kibana's contract.
    it('strips fields the upstream response does not declare', async () => {
      mockUiam.createServiceAccount.mockResolvedValue({
        ...validResponse,
        revoked: false,
        creator: { type: 'user', id: '12345' },
      } as never);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).resolves.toEqual(validResponse);
    });

    it('logs and rethrows upstream failures', async () => {
      mockUiam.createServiceAccount.mockRejectedValue(new Error('upstream exploded'));

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).rejects.toThrowError('upstream exploded');
    });
  });

  describe('fake request lifecycle', () => {
    beforeEach(() => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      jest.setSystemTime(new Date('2026-08-20T12:00:00.000Z'));

      let counter = 0;
      mockUiam.exchangeServiceAccountToken.mockImplementation(async () => ({
        token: `essu_token_${++counter}`,
      }));
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    describe('#createFakeRequest', () => {
      it('mints a token and returns a service-account-bound fake request', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
          spaceId: 'marketing',
        });

        expect(mockUiam.exchangeServiceAccountToken).toHaveBeenCalledWith('service-account-id');
        expect(request.isFakeRequest).toBe(true);
        expect(request.headers.authorization).toBe('Bearer essu_token_1');
        expect(request.spaceId).toBe('marketing');
        expect(request.auth.isAuthenticated).toBe(true);
      });

      it('rejects with a 403 when security features are disabled in Elasticsearch', async () => {
        mockLicense.isEnabled.mockReturnValue(false);

        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toMatchObject({ output: { statusCode: 403 } });

        expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
      });

      // The exchange response is spec/live-verified but still validated so that a shape change
      // fails loudly rather than leaking a partially-undefined credential into a request.
      it('rejects when the exchange response does not match the expected shape', async () => {
        mockUiam.exchangeServiceAccountToken.mockResolvedValue({ credential: 'nope' } as never);

        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toThrowError('Error occured during service account token exchange');
      });

      it('rejects when the exchange response contains an empty token', async () => {
        mockUiam.exchangeServiceAccountToken.mockResolvedValue({ token: '' });

        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toThrowError('Error occured during service account token exchange');
      });

      it('logs and rethrows exchange failures', async () => {
        mockUiam.exchangeServiceAccountToken.mockRejectedValue(new Error('upstream exploded'));

        await expect(
          serviceAccounts.createFakeRequest({ serviceAccountId: 'service-account-id' })
        ).rejects.toThrowError('upstream exploded');
      });
    });

    describe('#reauthenticateFakeRequest', () => {
      it('returns null for requests that are not bound to a service account', async () => {
        await expect(
          serviceAccounts.reauthenticateFakeRequest(httpServerMock.createFakeKibanaRequest({}))
        ).resolves.toBeNull();
        expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
      });

      it('reuses the current token without minting when it was minted recently', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        mockUiam.exchangeServiceAccountToken.mockClear();

        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toEqual({
          authorization: 'Bearer essu_token_1',
        });
        expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
      });

      it('mints a replacement and updates the request once the reuse window has passed', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        mockUiam.exchangeServiceAccountToken.mockClear();

        jest.advanceTimersByTime(SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS);

        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toEqual({
          authorization: 'Bearer essu_token_2',
        });
        expect(mockUiam.exchangeServiceAccountToken).toHaveBeenCalledTimes(1);
        expect(request.headers.authorization).toBe('Bearer essu_token_2');
      });

      it('returns null instead of throwing when minting fails', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        mockUiam.exchangeServiceAccountToken.mockClear();
        mockUiam.exchangeServiceAccountToken.mockRejectedValue(new Error('exchange failed'));

        jest.advanceTimersByTime(SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS);

        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
        // The stale credential is left in place for the original 401 to propagate.
        expect(request.headers.authorization).toBe('Bearer essu_token_1');
      });

      it('returns null without minting once the request lease has expired', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
          maxLifetimeMs: 1_000,
        });
        mockUiam.exchangeServiceAccountToken.mockClear();

        jest.advanceTimersByTime(1_001);

        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
        expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
        expect(request.headers.authorization).toBe('Bearer essu_token_1');
      });
    });

    describe('#releaseFakeRequest', () => {
      it('permanently disables credential replacement for the request', async () => {
        const request = await serviceAccounts.createFakeRequest({
          serviceAccountId: 'service-account-id',
        });
        mockUiam.exchangeServiceAccountToken.mockClear();

        serviceAccounts.releaseFakeRequest(request);

        jest.advanceTimersByTime(SERVICE_ACCOUNT_TOKEN_RETRY_REUSE_MS);

        await expect(serviceAccounts.reauthenticateFakeRequest(request)).resolves.toBeNull();
        expect(mockUiam.exchangeServiceAccountToken).not.toHaveBeenCalled();
        // The request rides out its current token; nothing is replaced.
        expect(request.headers.authorization).toBe('Bearer essu_token_1');
      });

      it('is a no-op for requests this backend did not mint', () => {
        expect(() =>
          serviceAccounts.releaseFakeRequest(httpServerMock.createFakeKibanaRequest({}))
        ).not.toThrow();
      });
    });
  });
});
