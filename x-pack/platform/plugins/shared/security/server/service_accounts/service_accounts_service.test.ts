/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import { loggingSystemMock, savedObjectsServiceMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import { ServiceAccountsService } from './service_accounts_service';
import { licenseMock } from '../../common/licensing/index.mock';
import type { ConfigType } from '../config';
import { uiamServiceMock } from '../uiam/uiam_service.mock';

describe('ServiceAccountsService', () => {
  const startParams = (config: Partial<ConfigType>, overrides = {}) => {
    const license = licenseMock.create();
    license.isEnabled.mockReturnValue(true);

    const uiam = uiamServiceMock.create();
    uiam.exchangeServiceAccountToken.mockResolvedValue({ token: 'essu_token' });

    // One client the test can drive, rather than a fresh mock per `getClient` call.
    const encryptedClient = encryptedSavedObjectsMock.createClient();
    encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('binding', 'id')
    );
    const encryptedSavedObjects = encryptedSavedObjectsMock.createStart();
    encryptedSavedObjects.getClient.mockReturnValue(encryptedClient);

    return {
      config: config as ConfigType,
      license,
      uiam,
      checkPrivilegesWithRequest: jest.fn(),
      organizationId: 'organization-id',
      projectId: 'project-id',
      projectType: 'security' as const,
      buildFlavor: 'serverless' as const,
      savedObjects: savedObjectsServiceMock.createStartContract(),
      encryptedSavedObjects,
      canEncrypt: true,
      getCurrentUser: jest.fn(),
      getCurrentProfileId: jest.fn().mockResolvedValue(null),
      getSpaceId: jest.fn().mockReturnValue('default'),
      ...overrides,
    };
  };

  let service: ServiceAccountsService;

  beforeEach(() => {
    service = new ServiceAccountsService(loggingSystemMock.create().get('service-accounts'));
  });

  describe('#start', () => {
    it('returns null when service accounts are not enabled', () => {
      expect(service.start(startParams({ serviceAccounts: { enabled: false } }))).toBeNull();
    });

    it('returns null when the feature is not configured at all', () => {
      expect(service.start(startParams({}))).toBeNull();
    });

    it('returns null before it can complain about a missing UIAM, when disabled', () => {
      expect(
        service.start(startParams({ serviceAccounts: { enabled: false } }, { uiam: undefined }))
      ).toBeNull();
    });

    it('selects the UIAM backend when UIAM and project context are available', async () => {
      const params = startParams({ serviceAccounts: { enabled: true } });
      const start = service.start(params)!;

      await start.createFakeRequest({ serviceAccountId: 'service-account-id' });
      expect(params.uiam.exchangeServiceAccountToken).toHaveBeenCalledWith('service-account-id');
    });

    it('exposes real workload bindings alongside the UIAM backend', async () => {
      const start = service.start(startParams({ serviceAccounts: { enabled: true } }))!;

      // A real binding layer reports "no binding" rather than refusing outright.
      await expect(
        start.workloads.getBinding('operation', { workloadType: 'rule', workloadId: 'rule-id' })
      ).resolves.toBeNull();
    });

    it('selects the Elasticsearch backend off serverless', async () => {
      const start = service.start(
        startParams({ serviceAccounts: { enabled: true } }, { buildFlavor: 'traditional' })
      )!;

      await expect(
        start.createFakeRequest({ serviceAccountId: 'service-account-id' })
      ).rejects.toMatchObject({
        message: 'Creating requests for Elasticsearch service accounts is not yet implemented',
        output: { statusCode: 501 },
      });
    });

    it('refuses workload bindings on the Elasticsearch backend', async () => {
      const start = service.start(
        startParams({ serviceAccounts: { enabled: true } }, { buildFlavor: 'traditional' })
      )!;

      await expect(
        start.workloads.getBinding('operation', { workloadType: 'rule', workloadId: 'rule-id' })
      ).rejects.toMatchObject({
        message:
          'Service account workload bindings are not yet implemented for the Elasticsearch backend',
        output: { statusCode: 501 },
      });
    });

    // A serverless project cannot serve service accounts without UIAM, and quietly starting
    // without them would surface much later as an unexplained failure to run a workload.
    it.each(['uiam', 'organizationId', 'projectId', 'projectType'] as const)(
      'throws when a serverless project is missing `%s`',
      (field) => {
        expect(() =>
          service.start(startParams({ serviceAccounts: { enabled: true } }, { [field]: undefined }))
        ).toThrowError(/^Cannot start service accounts: missing one or more required parameters/);
      }
    );

    it('names the parameters it did get, so the missing one is identifiable', () => {
      expect(() =>
        service.start(
          startParams({ serviceAccounts: { enabled: true } }, { organizationId: undefined })
        )
      ).toThrowError(/"projectId":"project-id".*"projectType":"security".*"uiam":"true"/);
    });
  });
});
