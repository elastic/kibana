/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';
import { UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE } from '../../saved_objects';
import { UiamApiKeyProvisioningEntityType } from '../../saved_objects/schemas/raw_uiam_api_keys_provisioning_status';
import {
  createFailedConversionStatus,
  createSkippedRuleStatus,
  createStatusFromBulkUpdateResult,
  deleteLegacyProvisioningStatusDocs,
} from './provisioning_status';

describe('provisioning status docs', () => {
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('doc ids', () => {
    it('namespaces the doc id by entity type so a rule never collides with the task sharing its uuid', () => {
      const sharedUuid = '1f7c9a4e-0000-4000-8000-000000000000';

      expect(createSkippedRuleStatus(sharedUuid, 'The rule has no API key')).toEqual(
        expect.objectContaining({
          id: `rule:${sharedUuid}`,
          attributes: expect.objectContaining({
            entityId: sharedUuid,
            entityType: UiamApiKeyProvisioningEntityType.RULE,
          }),
        })
      );
      expect(createFailedConversionStatus(sharedUuid, 'nope', '400')).toEqual(
        expect.objectContaining({
          id: `rule:${sharedUuid}`,
          attributes: expect.objectContaining({ entityId: sharedUuid, errorCode: '400' }),
        })
      );
      expect(createStatusFromBulkUpdateResult({ id: sharedUuid })).toEqual(
        expect.objectContaining({
          id: `rule:${sharedUuid}`,
          attributes: expect.objectContaining({ entityId: sharedUuid }),
        })
      );
    });
  });

  describe('deleteLegacyProvisioningStatusDocs', () => {
    it('deletes each bare entity id once', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkDelete.mockResolvedValue({ statuses: [] });

      await deleteLegacyProvisioningStatusDocs(savedObjectsClient, logger, [
        createSkippedRuleStatus('rule-1', 'The rule has no API key'),
        createFailedConversionStatus('rule-1', 'nope'),
        createSkippedRuleStatus('rule-2', 'The rule has no API key'),
      ]);

      expect(savedObjectsClient.bulkDelete).toHaveBeenCalledWith([
        { type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE, id: 'rule-1' },
        { type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE, id: 'rule-2' },
      ]);
    });

    it('does not call bulkDelete when there are no docs', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();

      await deleteLegacyProvisioningStatusDocs(savedObjectsClient, logger, []);

      expect(savedObjectsClient.bulkDelete).not.toHaveBeenCalled();
    });

    it('stays quiet for 404s, which are the steady state once no legacy doc is left', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          {
            id: 'rule-1',
            type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
            success: false,
            error: { error: 'Not Found', message: 'Not found', statusCode: 404 },
          },
        ],
      });

      await deleteLegacyProvisioningStatusDocs(savedObjectsClient, logger, [
        createSkippedRuleStatus('rule-1', 'The rule has no API key'),
      ]);

      expect(logger.warn).not.toHaveBeenCalled();
    });

    it('warns on non-404 per-item failures', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkDelete.mockResolvedValue({
        statuses: [
          {
            id: 'rule-1',
            type: UIAM_API_KEYS_PROVISIONING_STATUS_SAVED_OBJECT_TYPE,
            success: false,
            error: { error: 'Conflict', message: 'Conflict', statusCode: 409 },
          },
        ],
      });

      await deleteLegacyProvisioningStatusDocs(savedObjectsClient, logger, [
        createSkippedRuleStatus('rule-1', 'The rule has no API key'),
      ]);

      expect(logger.warn).toHaveBeenCalledWith(
        'Failed to delete 1 legacy UIAM provisioning status doc(s): Conflict',
        expect.objectContaining({ tags: expect.any(Array) })
      );
    });

    it('swallows a whole-call bulkDelete failure', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkDelete.mockRejectedValue(new Error('bulkDelete failed'));

      await expect(
        deleteLegacyProvisioningStatusDocs(savedObjectsClient, logger, [
          createSkippedRuleStatus('rule-1', 'The rule has no API key'),
        ])
      ).resolves.toBeUndefined();

      expect(logger.warn).toHaveBeenCalledWith(
        'Error deleting legacy UIAM provisioning status docs: bulkDelete failed',
        expect.objectContaining({ tags: expect.any(Array) })
      );
    });
  });
});
