/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import {
  elasticsearchServiceMock,
  loggingSystemMock,
  savedObjectsServiceMock,
} from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';

import { EsServiceAccounts } from './es_service_accounts';
import { ServiceAccountsService } from './service_accounts_service';
import { UiamServiceAccounts } from './uiam_service_accounts';
import { licenseMock } from '../../common/licensing/index.mock';
import { ConfigSchema, createConfig } from '../config';
import { uiamServiceMock } from '../uiam/uiam_service.mock';

describe('ServiceAccountsService', () => {
  const startParams = (
    config: { serviceAccounts?: { enabled: boolean; requestLifetime?: string } },
    overrides = {}
  ) => {
    // One client the test can drive, rather than a fresh mock per `getClient` call.
    const encryptedClient = encryptedSavedObjectsMock.createClient();
    encryptedClient.getDecryptedAsInternalUser.mockRejectedValue(
      SavedObjectsErrorHelpers.createGenericNotFoundError('binding', 'id')
    );
    const encryptedSavedObjects = encryptedSavedObjectsMock.createStart();
    encryptedSavedObjects.getClient.mockReturnValue(encryptedClient);

    return {
      config: createConfig(
        ConfigSchema.validate(config, { serverless: config.serviceAccounts !== undefined }),
        loggingSystemMock.createLogger(),
        { isTLSEnabled: false }
      ),
      license: licenseMock.create(),
      uiam: uiamServiceMock.create(),
      checkPrivilegesWithRequest: jest.fn(),
      getCurrentUser: jest.fn(),
      cloudProjectContext: {
        organizationId: 'organization-id',
        projectId: 'project-id',
        projectType: 'security' as const,
      },
      clusterClient: elasticsearchServiceMock.createClusterClient(),
      savedObjects: savedObjectsServiceMock.createStartContract(),
      encryptedSavedObjects,
      canEncrypt: true,
      getCurrentUserProfileId: jest.fn().mockResolvedValue(null),
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

    it('returns null when the feature is not configured at all (non-serverless)', () => {
      expect(service.start(startParams({}))).toBeNull();
    });

    it('selects the UIAM backend when UIAM and project context are available', () => {
      expect(
        service.start(startParams({ serviceAccounts: { enabled: true } }))?.backend
      ).toBeInstanceOf(UiamServiceAccounts);
    });

    it('falls back to the Elasticsearch backend when UIAM is unavailable', () => {
      expect(
        service.start(startParams({ serviceAccounts: { enabled: true } }, { uiam: undefined }))
          ?.backend
      ).toBeInstanceOf(EsServiceAccounts);
    });

    it('falls back to Elasticsearch when project context is unavailable', () => {
      expect(
        service.start(
          startParams({ serviceAccounts: { enabled: true } }, { cloudProjectContext: undefined })
        )?.backend
      ).toBeInstanceOf(EsServiceAccounts);
    });

    it('passes the configured refresh lifetime to the UIAM backend', async () => {
      jest.useFakeTimers({ doNotFake: ['nextTick', 'setImmediate'] });
      try {
        const params = startParams({ serviceAccounts: { enabled: true, requestLifetime: '1s' } });
        params.license.isEnabled.mockReturnValue(true);
        const start = service.start(params);
        if (!start) throw new Error('Expected UIAM backend');
        const { backend } = start;
        const request = await backend.createFakeRequest({ serviceAccountId: 'sa-id' });
        jest.advanceTimersByTime(1_000);
        await expect(backend.reauthenticateFakeRequest(request)).resolves.toBeNull();
        expect(params.uiam.exchangeServiceAccountToken).toHaveBeenCalledTimes(1);
      } finally {
        jest.useRealTimers();
      }
    });

    it('exposes real workload bindings alongside the UIAM backend', async () => {
      const params = startParams({ serviceAccounts: { enabled: true } });
      params.license.isEnabled.mockReturnValue(true);
      const start = service.start(params)!;

      // A real binding layer reports "no binding" rather than refusing outright.
      await expect(
        start.workloads.getBinding('alerting', {
          workloadType: 'rule',
          workloadId: 'rule-id',
          spaceId: 'default',
        })
      ).resolves.toBeNull();
    });

    it('refuses workload bindings on the Elasticsearch backend', async () => {
      const start = service.start(
        startParams({ serviceAccounts: { enabled: true } }, { uiam: undefined })
      )!;

      await expect(
        start.workloads.getBinding('alerting', {
          workloadType: 'rule',
          workloadId: 'rule-id',
          spaceId: 'default',
        })
      ).rejects.toMatchObject({
        message:
          'Service account workload bindings are not yet implemented for the Elasticsearch backend',
        output: { statusCode: 501 },
      });
    });
  });
});
