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
        ConfigSchema.validate(config, { serverless: true }),
        loggingSystemMock.createLogger(),
        { isTLSEnabled: false }
      ),
      isServerless: true,
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
  let logger: ReturnType<typeof loggingSystemMock.createLogger>;

  beforeEach(() => {
    logger = loggingSystemMock.createLogger();
    service = new ServiceAccountsService(logger);
  });

  describe('#start', () => {
    it('returns null when service accounts are not enabled', () => {
      expect(service.start(startParams({ serviceAccounts: { enabled: false } }))).toBeNull();
    });

    it('returns null when the feature is not configured at all', () => {
      expect(service.start(startParams({}))).toBeNull();
    });

    it('selects the UIAM backend on serverless', () => {
      expect(
        service.start(startParams({ serviceAccounts: { enabled: true } }))?.backend
      ).toBeInstanceOf(UiamServiceAccounts);
    });

    it('selects the Elasticsearch backend outside serverless', () => {
      expect(
        service.start(startParams({ serviceAccounts: { enabled: true } }, { isServerless: false }))
          ?.backend
      ).toBeInstanceOf(EsServiceAccounts);
    });

    // The offering decides, not what happens to be wired up: a serverless deployment must never
    // reach Elasticsearch's service accounts, and a traditional one must never reach UIAM.
    it('selects the Elasticsearch backend outside serverless even when UIAM is configured', () => {
      const params = startParams({ serviceAccounts: { enabled: true } }, { isServerless: false });

      expect(service.start(params)?.backend).toBeInstanceOf(EsServiceAccounts);
      expect(params.uiam.createServiceAccount).not.toHaveBeenCalled();
    });

    it.each([
      ['the UIAM service was never constructed', { uiam: undefined }],
      ['the cloud project context is missing', { cloudProjectContext: undefined }],
    ] as const)(
      'reports the feature as unavailable on serverless when %s',
      (expectedCause, overrides) => {
        expect(
          service.start(startParams({ serviceAccounts: { enabled: true } }, overrides))
        ).toBeNull();
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining(expectedCause));
      }
    );

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
        startParams({ serviceAccounts: { enabled: true } }, { isServerless: false })
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
