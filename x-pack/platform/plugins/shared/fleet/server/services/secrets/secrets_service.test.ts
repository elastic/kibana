/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import type { KibanaRequest } from '@kbn/core/server';
import { httpServerMock } from '@kbn/core/server/mocks';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { GLOBAL_SETTINGS_ID, GLOBAL_SETTINGS_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { FleetConfigType } from '../../../common/types';
import type { PackagePolicy, SettingsSOAttributes } from '../../types';
import type { MockedFleetAppContext } from '../../mocks';
import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../app_context';
import { auditLoggingService } from '../audit_logging';
import { checkFleetServerVersionsForSecretsStorage } from '../fleet_server';
import { packagePolicyService } from '../package_policy';

import type { SecretStorageFeature } from './secrets_service';
import { createSecretsService } from './secrets_service';

jest.mock('timers/promises'); // skips the backoff between retried Elasticsearch attempts
jest.mock('../fleet_server'); // stubs checkFleetServerVersionsForSecretsStorage
jest.mock('../package_policy'); // stubs the package policy lookup behind the reference check

const mockedCheckFleetServerVersions = jest.mocked(checkFleetServerVersionsForSecretsStorage);
const mockedPackagePolicyService = jest.mocked(packagePolicyService);

// Elasticsearch auto-generated document ids, as returned by `POST _fleet/secret`.
const SECRET_ID = 'yDS3pJQBWKcmPmxmCXvU';
const OTHER_SECRET_ID = 'zB4sl5QBAyYgpnf8pVQs';

// `attempts` counts the Elasticsearch client's own retries before this response.
const buildResponseError = (statusCode: number, attempts = 0): EsErrors.ResponseError =>
  new EsErrors.ResponseError({
    statusCode,
    body: { error: { type: 'some_exception', reason: 'some reason' } },
    headers: {},
    meta: { attempts } as DiagnosticResult['meta'],
    warnings: [],
  });

describe('createSecretsService', () => {
  const esClientMock = elasticsearchServiceMock.createInternalClient();
  const soClientMock = savedObjectsClientMock.create();
  const consumer = 'security_solution';
  let mockContext: MockedFleetAppContext;

  const createService = (request?: KibanaRequest) =>
    createSecretsService({ esClient: esClientMock, soClient: soClientMock, consumer, request });

  const mockSettingsSO = (attributes: SettingsSOAttributes) => {
    soClientMock.find.mockResolvedValue({
      saved_objects: [
        {
          id: GLOBAL_SETTINGS_ID,
          type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
          attributes,
          references: [],
          score: 0,
        },
      ],
      total: 1,
      page: 1,
      per_page: 10,
    });
  };

  beforeEach(() => {
    mockContext = createAppContextStartContractMock();
    appContextService.start(mockContext);
    soClientMock.update.mockResolvedValue({
      id: GLOBAL_SETTINGS_ID,
      type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: {},
      references: [],
    });
    mockedPackagePolicyService.list.mockResolvedValue({
      items: [],
      total: 0,
      page: 1,
      perPage: 10000,
    });
  });

  afterEach(() => {
    appContextService.stop();
    jest.clearAllMocks();
  });

  it('requires a consumer', () => {
    expect(() =>
      createSecretsService({ esClient: esClientMock, soClient: soClientMock, consumer: '' })
    ).toThrow('A consumer is required');
  });

  describe('isSecretStorageEnabledForFeature', () => {
    it('returns true for standalone Fleet Server without reading settings or checking versions', async () => {
      appContextService.start(
        createAppContextStartContractMock({
          internal: { fleetServerStandalone: true } as FleetConfigType['internal'],
        })
      );

      await expect(
        createService().isSecretStorageEnabledForFeature('response_actions_export')
      ).resolves.toBe(true);
      expect(soClientMock.find).not.toHaveBeenCalled();
      expect(mockedCheckFleetServerVersions).not.toHaveBeenCalled();
    });

    it('returns true from the latched setting without checking versions', async () => {
      mockSettingsSO({ response_actions_export_secret_storage_requirements_met: true });

      await expect(
        createService().isSecretStorageEnabledForFeature('response_actions_export')
      ).resolves.toBe(true);
      expect(mockedCheckFleetServerVersions).not.toHaveBeenCalled();
      expect(soClientMock.update).not.toHaveBeenCalled();
    });

    it('does not treat another latched feature as met', async () => {
      mockSettingsSO({ action_secret_storage_requirements_met: true });
      mockedCheckFleetServerVersions.mockResolvedValue(false);

      await expect(
        createService().isSecretStorageEnabledForFeature('response_actions_export')
      ).resolves.toBe(false);
      expect(mockedCheckFleetServerVersions).toHaveBeenCalledTimes(1);
    });

    it("checks Fleet's minimum version and latches Fleet's settings key when met", async () => {
      mockSettingsSO({});
      mockedCheckFleetServerVersions.mockResolvedValue(true);

      await expect(
        createService().isSecretStorageEnabledForFeature('response_actions_export')
      ).resolves.toBe(true);
      expect(mockedCheckFleetServerVersions).toHaveBeenCalledWith(
        esClientMock,
        soClientMock,
        '9.6.0'
      );
      expect(soClientMock.update).toHaveBeenCalledWith(
        GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
        GLOBAL_SETTINGS_ID,
        { response_actions_export_secret_storage_requirements_met: true },
        {}
      );
    });

    it('returns false and does not latch the setting when a Fleet Server is below the minimum version', async () => {
      mockSettingsSO({});
      mockedCheckFleetServerVersions.mockResolvedValue(false);

      await expect(
        createService().isSecretStorageEnabledForFeature('response_actions_export')
      ).resolves.toBe(false);
      expect(soClientMock.update).not.toHaveBeenCalled();
    });

    it('rejects an unknown feature without reading settings', async () => {
      const unknownFeature: string = 'some_other_feature';

      await expect(
        createService().isSecretStorageEnabledForFeature(unknownFeature as SecretStorageFeature)
      ).rejects.toThrow('Unknown secret storage feature');
      expect(soClientMock.find).not.toHaveBeenCalled();
    });
  });

  describe('deleteSecrets', () => {
    it('reports each id as deleted or unknown, in input order, and audits only real deletions', async () => {
      esClientMock.transport.request.mockImplementation(async ({ path }) => {
        if (path === `/_fleet/secret/${OTHER_SECRET_ID}`) {
          throw buildResponseError(404);
        }
        return { deleted: true };
      });

      await expect(createService().deleteSecrets([SECRET_ID, OTHER_SECRET_ID])).resolves.toEqual([
        { id: SECRET_ID, deleted: true },
        { id: OTHER_SECRET_ID, deleted: false },
      ]);
      expect(esClientMock.transport.request.mock.calls.map(([req]) => req)).toEqual([
        { method: 'DELETE', path: `/_fleet/secret/${SECRET_ID}` },
        { method: 'DELETE', path: `/_fleet/secret/${OTHER_SECRET_ID}` },
      ]);
      expect(mockContext.securitySetup.audit.withoutRequest.log).toHaveBeenCalledTimes(1);
      expect(mockContext.securitySetup.audit.withoutRequest.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `secret deleted: ${SECRET_ID}`,
          event: expect.objectContaining({ action: 'secret_delete', outcome: 'success' }),
        })
      );
    });

    it('rejects malformed ids without calling Elasticsearch', async () => {
      await expect(
        createService().deleteSecrets([SECRET_ID, '../../_security/user/elastic'])
      ).rejects.toThrow('malformed Fleet secret id');
      expect(esClientMock.transport.request).not.toHaveBeenCalled();
    });

    it('rejects ids a package policy in any space references without deleting any id', async () => {
      mockedPackagePolicyService.list.mockResolvedValue({
        items: [
          {
            id: 'package-policy-1',
            policy_ids: ['agent-policy-1'],
            secret_references: [{ id: OTHER_SECRET_ID }],
          } as PackagePolicy,
        ],
        total: 1,
        page: 1,
        perPage: 10000,
      });

      await expect(createService().deleteSecrets([SECRET_ID, OTHER_SECRET_ID])).rejects.toThrow(
        `Cannot delete 1 Fleet secret id(s) still referenced by package policies: ${OTHER_SECRET_ID}`
      );
      expect(mockedPackagePolicyService.list).toHaveBeenCalledWith(
        soClientMock,
        expect.objectContaining({ spaceId: '*' })
      );
      expect(esClientMock.transport.request).not.toHaveBeenCalled();
    });

    it('counts a 404 after a request Fleet retried as an unconfirmed deletion', async () => {
      esClientMock.transport.request
        .mockRejectedValueOnce(new EsErrors.TimeoutError('Request timed out'))
        .mockRejectedValueOnce(buildResponseError(404));

      await expect(createService().deleteSecrets([SECRET_ID])).resolves.toEqual([
        { id: SECRET_ID, deleted: true },
      ]);
      expect(esClientMock.transport.request).toHaveBeenCalledTimes(2);
      expect(mockContext.securitySetup.audit.withoutRequest.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `secret possibly deleted: ${SECRET_ID}`,
          event: expect.objectContaining({ action: 'secret_delete', outcome: 'unknown' }),
        })
      );
    });

    it('counts a 404 after a request the Elasticsearch client retried as an unconfirmed deletion', async () => {
      esClientMock.transport.request.mockRejectedValueOnce(buildResponseError(404, 1));

      await expect(createService().deleteSecrets([SECRET_ID])).resolves.toEqual([
        { id: SECRET_ID, deleted: true },
      ]);
      expect(esClientMock.transport.request).toHaveBeenCalledTimes(1);
      expect(mockContext.securitySetup.audit.withoutRequest.log).toHaveBeenCalledWith(
        expect.objectContaining({
          event: expect.objectContaining({ action: 'secret_delete', outcome: 'unknown' }),
        })
      );
    });

    it('fails without an audit entry when Elasticsearch rejects the request', async () => {
      esClientMock.transport.request.mockRejectedValue(buildResponseError(403));

      await expect(createService().deleteSecrets([SECRET_ID])).rejects.toThrow(
        'Error deleting secrets'
      );
      expect(mockContext.securitySetup.audit.withoutRequest.log).not.toHaveBeenCalled();
    });

    it('fails and audits a possible deletion when the request may have run', async () => {
      // A proxy timed out every attempt the Elasticsearch client made.
      esClientMock.transport.request.mockRejectedValue(buildResponseError(504, 3));

      await expect(createService().deleteSecrets([SECRET_ID])).rejects.toThrow(
        'Error deleting secrets'
      );
      expect(mockContext.securitySetup.audit.withoutRequest.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `secret possibly deleted: ${SECRET_ID}`,
          event: expect.objectContaining({ action: 'secret_delete', outcome: 'unknown' }),
        })
      );
    });
  });

  describe('createSecrets', () => {
    it('returns the created ids in input order', async () => {
      const resolveRequestByValue = new Map<string, (secret: { id: string }) => void>();
      esClientMock.transport.request.mockImplementation(({ body }) => {
        const { value } = body as { value: string };
        const { promise, resolve } = Promise.withResolvers<{ id: string }>();
        resolveRequestByValue.set(value, resolve);
        return promise;
      });

      const created = createService().createSecrets(['first', 'second', 'third']);
      // Elasticsearch answers in reverse order.
      ['third', 'second', 'first'].forEach((value) =>
        resolveRequestByValue.get(value)?.({ id: `${value}-id` })
      );

      await expect(created).resolves.toEqual([
        { id: 'first-id' },
        { id: 'second-id' },
        { id: 'third-id' },
      ]);
    });

    it('returns an empty list without calling Elasticsearch when there are no values', async () => {
      await expect(createService().createSecrets([])).resolves.toEqual([]);
      expect(esClientMock.transport.request).not.toHaveBeenCalled();
    });
  });

  describe('audit entries', () => {
    it('record the consumer and the user of the request', async () => {
      const request = httpServerMock.createKibanaRequest();
      esClientMock.transport.request.mockResolvedValue({ id: SECRET_ID });

      await createService(request).createSecrets(['value']);

      const { asScoped, withoutRequest } = mockContext.securitySetup.audit;
      expect(asScoped).toHaveBeenCalledWith(request);
      expect(asScoped.mock.results[0].value.log).toHaveBeenCalledWith(
        expect.objectContaining({
          message: `secret created: ${SECRET_ID}`,
          labels: { consumer, application: 'elastic/fleet' },
        })
      );
      expect(withoutRequest.log).not.toHaveBeenCalled();
    });

    it('record the consumer without a request, including the settings latch write', async () => {
      mockSettingsSO({});
      mockedCheckFleetServerVersions.mockResolvedValue(true);

      await createService().isSecretStorageEnabledForFeature('response_actions_export');

      const auditEvents = jest
        .mocked(mockContext.securitySetup.audit.withoutRequest.log)
        .mock.calls.map(([event]) => event);
      expect(auditEvents).toContainEqual(
        expect.objectContaining({
          event: expect.objectContaining({ action: 'saved_object_update' }),
        })
      );
      auditEvents.forEach((event) =>
        expect(event?.labels).toEqual({ consumer, application: 'elastic/fleet' })
      );
    });

    it('do not record a consumer for audit entries written outside the service', async () => {
      esClientMock.transport.request.mockResolvedValue({ id: SECRET_ID });
      await createService().createSecrets(['value']);

      auditLoggingService.writeCustomAuditLog({ message: 'written by Fleet' });

      expect(mockContext.securitySetup.audit.withoutRequest.log).toHaveBeenLastCalledWith({
        message: 'written by Fleet',
        labels: { application: 'elastic/fleet' },
      });
    });
  });
});
