/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors as EsErrors } from '@elastic/elasticsearch';
import type { DiagnosticResult } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core-elasticsearch-server-mocks';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';

import { GLOBAL_SETTINGS_ID, GLOBAL_SETTINGS_SAVED_OBJECT_TYPE } from '../../../common/constants';
import type { FleetConfigType } from '../../../common/types';
import type { SettingsSOAttributes } from '../../types';
import { createAppContextStartContractMock } from '../../mocks';
import { appContextService } from '../app_context';
import { auditLoggingService } from '../audit_logging';
import { checkFleetServerVersionsForSecretsStorage } from '../fleet_server';

import { createSecretsService } from './secrets_service';

jest.mock('../fleet_server'); // stubs checkFleetServerVersionsForSecretsStorage

const mockedCheckFleetServerVersions = jest.mocked(checkFleetServerVersionsForSecretsStorage);

const buildResponseError = (statusCode: number): EsErrors.ResponseError =>
  new EsErrors.ResponseError({
    statusCode,
    body: { error: { type: 'some_exception', reason: 'some reason' } },
    headers: {},
    meta: {} as DiagnosticResult['meta'],
    warnings: [],
  });

describe('createSecretsService', () => {
  const esClientMock = elasticsearchServiceMock.createInternalClient();
  const soClientMock = savedObjectsClientMock.create();
  const secretsService = createSecretsService(esClientMock, soClientMock);

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
    appContextService.start(createAppContextStartContractMock());
    soClientMock.update.mockResolvedValue({
      id: GLOBAL_SETTINGS_ID,
      type: GLOBAL_SETTINGS_SAVED_OBJECT_TYPE,
      attributes: {},
      references: [],
    });
  });

  afterEach(() => {
    appContextService.stop();
    jest.clearAllMocks();
  });

  describe('isSecretStorageEnabledForFeature', () => {
    const opts = {
      featureName: 'Response actions export',
      minimumFleetServerVersion: '9.6.0',
      settingKey: 'response_actions_export_secret_storage_requirements_met' as const,
    };

    it('returns true for standalone Fleet Server without reading settings or checking versions', async () => {
      appContextService.start(
        createAppContextStartContractMock({
          internal: { fleetServerStandalone: true } as FleetConfigType['internal'],
        })
      );

      await expect(secretsService.isSecretStorageEnabledForFeature(opts)).resolves.toBe(true);
      expect(soClientMock.find).not.toHaveBeenCalled();
      expect(mockedCheckFleetServerVersions).not.toHaveBeenCalled();
    });

    it('returns true from the latched setting without checking versions', async () => {
      mockSettingsSO({ response_actions_export_secret_storage_requirements_met: true });

      await expect(secretsService.isSecretStorageEnabledForFeature(opts)).resolves.toBe(true);
      expect(mockedCheckFleetServerVersions).not.toHaveBeenCalled();
      expect(soClientMock.update).not.toHaveBeenCalled();
    });

    it('does not treat another latched feature as met', async () => {
      mockSettingsSO({ action_secret_storage_requirements_met: true });
      mockedCheckFleetServerVersions.mockResolvedValue(false);

      await expect(secretsService.isSecretStorageEnabledForFeature(opts)).resolves.toBe(false);
      expect(mockedCheckFleetServerVersions).toHaveBeenCalledTimes(1);
    });

    it('returns true and latches the setting when all Fleet Servers meet the minimum version', async () => {
      mockSettingsSO({});
      mockedCheckFleetServerVersions.mockResolvedValue(true);

      await expect(secretsService.isSecretStorageEnabledForFeature(opts)).resolves.toBe(true);
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

      await expect(secretsService.isSecretStorageEnabledForFeature(opts)).resolves.toBe(false);
      expect(soClientMock.update).not.toHaveBeenCalled();
    });
  });

  describe('deleteSecrets', () => {
    it('ignores ids that do not exist and deletes the rest', async () => {
      const writeCustomAuditLogSpy = jest.spyOn(auditLoggingService, 'writeCustomAuditLog');
      esClientMock.transport.request.mockImplementation(async ({ path }) => {
        if (path === '/_fleet/secret/missing-id') {
          throw buildResponseError(404);
        }
        return { deleted: true };
      });

      await expect(secretsService.deleteSecrets(['existing-id', 'missing-id'])).resolves.toBe(
        undefined
      );
      expect(esClientMock.transport.request.mock.calls.map(([req]) => req.path)).toEqual([
        '/_fleet/secret/existing-id',
        '/_fleet/secret/missing-id',
      ]);
      expect(writeCustomAuditLogSpy).toHaveBeenCalledTimes(1);
      expect(writeCustomAuditLogSpy).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'secret deleted: existing-id' })
      );
    });

    it('fails on errors other than a missing id', async () => {
      esClientMock.transport.request.mockRejectedValue(buildResponseError(403));

      await expect(secretsService.deleteSecrets(['some-id'])).rejects.toThrow(
        'Error deleting secrets'
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

      const created = secretsService.createSecrets(['first', 'second', 'third']);
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
      await expect(secretsService.createSecrets([])).resolves.toEqual([]);
      expect(esClientMock.transport.request).not.toHaveBeenCalled();
    });
  });
});
