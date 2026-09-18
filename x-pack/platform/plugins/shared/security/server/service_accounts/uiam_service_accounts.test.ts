/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AuthenticatedUser, KibanaRequest, ServiceAccount } from '@kbn/core/server';
import { httpServerMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import { HTTPAuthorizationHeader } from '@kbn/core-security-server';
import type { Logger } from '@kbn/logging';
import type {
  CheckPrivileges,
  CheckPrivilegesResponse,
  CheckPrivilegesWithRequest,
} from '@kbn/security-plugin-types-server';

import { UiamServiceAccounts } from './uiam_service_accounts';
import type { SecurityLicense } from '../../common';
import { licenseMock } from '../../common/licensing/index.mock';
import { SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH } from '../../common/service_accounts';
import type { UiamServicePublic } from '../uiam';
import { uiamServiceMock } from '../uiam/uiam_service.mock';

describe('UiamServiceAccounts', () => {
  let serviceAccounts: UiamServiceAccounts;
  let mockLicense: jest.Mocked<SecurityLicense>;
  let mockUiam: jest.Mocked<UiamServicePublic>;
  let mockCheckPrivileges: jest.Mocked<CheckPrivileges>;
  let mockCheckPrivilegesWithRequest: jest.Mocked<CheckPrivilegesWithRequest>;
  let logger: Logger;
  let getCurrentUser: jest.Mock<AuthenticatedUser | null, [KibanaRequest]>;

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
    getCurrentUser = jest.fn().mockReturnValue(null);
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
      getCurrentUser,
      cloudProjectContext: {
        organizationId: 'organization-id',
        projectId: 'project-id',
        projectType: 'security',
      },
    });
  });

  describe('#create', () => {
    it('forwards the caller access token, the fixed `role_assignments` and the derived `assumable_by`', async () => {
      mockUiam.createServiceAccount.mockResolvedValue(validResponse);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).resolves.toEqual(validResponse);

      expect(mockUiam.createServiceAccount).toHaveBeenCalledTimes(1);
      expect(mockUiam.createServiceAccount).toHaveBeenCalledWith(
        new HTTPAuthorizationHeader('Bearer', 'essu_my_token'),
        {
          organization_id: 'organization-id',
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
        },
        { includeClientAuthentication: true }
      );
    });

    it.each([true, false])(
      'preserves API-key authentication when internal=%s',
      async (internal) => {
        getCurrentUser.mockReturnValue(
          mockAuthenticatedUser({
            authentication_type: 'api_key',
            api_key: { id: 'key-id', name: 'key-name', managed_by: 'cloud', internal },
          })
        );
        mockUiam.createServiceAccount.mockResolvedValue(validResponse);
        await serviceAccounts.create(createMockRequest('ApiKey essu_key'), createParams);
        expect(mockUiam.createServiceAccount).toHaveBeenCalledWith(
          new HTTPAuthorizationHeader('ApiKey', 'essu_key'),
          expect.objectContaining({ organization_id: 'organization-id' }),
          { includeClientAuthentication: internal }
        );
      }
    );

    it('uses client authentication when API-key metadata is unavailable', async () => {
      mockUiam.createServiceAccount.mockResolvedValue(validResponse);
      await serviceAccounts.create(createMockRequest('ApiKey essu_key'), createParams);
      expect(mockUiam.createServiceAccount).toHaveBeenCalledWith(
        new HTTPAuthorizationHeader('ApiKey', 'essu_key'),
        expect.anything(),
        { includeClientAuthentication: true }
      );
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
      expect(logger.warn).toHaveBeenCalledWith(
        'Service account creation denied: missing `manage_security` cluster privilege'
      );
    });

    it.each<{ assumableBy: ServiceAccount['assumable_by'] }>([
      { assumableBy: validResponse.assumable_by },
      {
        assumableBy: [{ type: 'platform-service-account', service_account_id: 'nightshift-relay' }],
      },
      {
        assumableBy: [
          ...validResponse.assumable_by,
          { type: 'platform-service-account', service_account_id: 'nightshift-relay' },
          { type: 'platform-service-account', service_account_id: 'another-platform-service' },
        ],
      },
    ])(
      'accepts supported principals in the UIAM response: $assumableBy',
      async ({ assumableBy }) => {
        const result = { ...validResponse, assumable_by: assumableBy };
        mockUiam.createServiceAccount.mockResolvedValue(result);

        await expect(
          serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
        ).resolves.toEqual(result);
        expect(logger.error).not.toHaveBeenCalled();
      }
    );

    it.each([
      { id: 'service-account-id' } as ServiceAccount,
      { ...validResponse, assumable_by: [{ type: 'project-service-account' }] } as ServiceAccount,
      { ...validResponse, id: 'a'.repeat(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH + 1) },
      {
        ...validResponse,
        assumable_by: [{ type: 'platform-service-account' }],
      } as ServiceAccount,
      {
        ...validResponse,
        assumable_by: [{ type: 'platform-service-account', service_account_id: 123 }],
      } as never,
      {
        ...validResponse,
        assumable_by: [
          {
            type: 'platform-service-account',
            service_account_id: 'a'.repeat(SERVICE_ACCOUNT_MAX_STRING_FIELD_LENGTH + 1),
          },
        ],
      } as ServiceAccount,
      {
        ...validResponse,
        assumable_by: [{ type: 'unsupported-service-account', service_account_id: 'relay' }],
      } as never,
      {
        ...validResponse,
        assumable_by: [validResponse.assumable_by[0], { type: 'platform-service-account' }],
      } as ServiceAccount,
    ])('logs validation failures and returns the original response', async (result) => {
      mockUiam.createServiceAccount.mockResolvedValue(result);

      await expect(
        serviceAccounts.create(createMockRequest('Bearer essu_my_token'), createParams)
      ).resolves.toBe(result);
      expect(logger.error).toHaveBeenCalledTimes(1);
      expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('failed validation'));
      expect(mockUiam.createServiceAccount).toHaveBeenCalledTimes(1);
    });

    // Successful validation strips extra fields from the documented response.
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
});
