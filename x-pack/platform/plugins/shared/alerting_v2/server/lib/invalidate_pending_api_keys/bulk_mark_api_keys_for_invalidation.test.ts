/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsClientMock } from '@kbn/core/server/mocks';

import { API_KEY_PENDING_INVALIDATION_TYPE } from '../../saved_objects';
import { bulkMarkApiKeysForInvalidation } from './bulk_mark_api_keys_for_invalidation';

describe('bulkMarkApiKeysForInvalidation', () => {
  describe('empty list', () => {
    it('does not call savedObjectsClient bulkCreate when apiKeys is empty', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [] });

      await bulkMarkApiKeysForInvalidation(
        { apiKeys: [] },
        loggingSystemMock.create().get(),
        savedObjectsClient
      );

      expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled();
    });
  });

  describe('ES API keys', () => {
    it('creates saved objects with correct attributes for ES API keys (no uiamApiKey)', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [] });

      await bulkMarkApiKeysForInvalidation(
        {
          apiKeys: [Buffer.from('123').toString('base64'), Buffer.from('456').toString('base64')],
        },
        loggingSystemMock.create().get(),
        savedObjectsClient
      );

      const bulkCreateCallMock = savedObjectsClient.bulkCreate.mock.calls[0];
      const savedObjects = bulkCreateCallMock[0];

      expect(savedObjectsClient.bulkCreate).toHaveBeenCalledTimes(1);
      expect(savedObjects).toHaveLength(2);
      expect(savedObjects[0]).toHaveProperty('type', API_KEY_PENDING_INVALIDATION_TYPE);
      expect(savedObjects[0]).toHaveProperty('attributes.apiKeyId', '123');
      expect(savedObjects[0]).toHaveProperty('attributes.createdAt', expect.any(String));
      expect(savedObjects[0].attributes).not.toHaveProperty('uiamApiKey');
      expect(savedObjects[1]).toHaveProperty('type', API_KEY_PENDING_INVALIDATION_TYPE);
      expect(savedObjects[1]).toHaveProperty('attributes.apiKeyId', '456');
      expect(savedObjects[1]).toHaveProperty('attributes.createdAt', expect.any(String));
      expect(savedObjects[1].attributes).not.toHaveProperty('uiamApiKey');
    });
  });

  describe('UIAM credentials', () => {
    it('creates saved objects with uiamApiKey for UIAM credentials', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [] });

      await bulkMarkApiKeysForInvalidation(
        {
          apiKeys: [
            Buffer.from('111:essu_uiam_key_value_1').toString('base64'),
            Buffer.from('222:essu_uiam_key_value_2').toString('base64'),
          ],
        },
        loggingSystemMock.create().get(),
        savedObjectsClient
      );

      const bulkCreateCallMock = savedObjectsClient.bulkCreate.mock.calls[0];
      const savedObjects = bulkCreateCallMock[0];

      expect(savedObjects).toHaveLength(2);
      expect(savedObjects[0]).toHaveProperty('type', API_KEY_PENDING_INVALIDATION_TYPE);
      expect(savedObjects[0]).toHaveProperty('attributes.apiKeyId', '111');
      expect(savedObjects[0]).toHaveProperty('attributes.uiamApiKey', 'essu_uiam_key_value_1');
      expect(savedObjects[0]).toHaveProperty('attributes.createdAt', expect.any(String));
      expect(savedObjects[1]).toHaveProperty('type', API_KEY_PENDING_INVALIDATION_TYPE);
      expect(savedObjects[1]).toHaveProperty('attributes.apiKeyId', '222');
      expect(savedObjects[1]).toHaveProperty('attributes.uiamApiKey', 'essu_uiam_key_value_2');
      expect(savedObjects[1]).toHaveProperty('attributes.createdAt', expect.any(String));
    });
  });

  describe('base64 parsing', () => {
    it('decodes base64-encoded id:key format and sets apiKeyId and uiamApiKey for UIAM', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [] });
      // base64('id123:essu_uiam_value') => 'aWQxMjM6ZXNzdV91aWFtX3ZhbHVl'
      const base64Key = Buffer.from('id123:essu_uiam_value').toString('base64');

      await bulkMarkApiKeysForInvalidation(
        { apiKeys: [base64Key] },
        loggingSystemMock.create().get(),
        savedObjectsClient
      );

      const savedObjects = savedObjectsClient.bulkCreate.mock
        .calls[0][0] as Array<{ attributes: { apiKeyId: string; uiamApiKey?: string } }>;
      expect(savedObjects).toHaveLength(1);
      expect(savedObjects[0].attributes).toMatchObject({
        apiKeyId: 'id123',
        uiamApiKey: 'essu_uiam_value',
      });
    });

    it('decodes base64-encoded id-only format and sets apiKeyId for ES key', async () => {
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [] });
      const base64Key = Buffer.from('es-api-key-id-only').toString('base64');

      await bulkMarkApiKeysForInvalidation(
        { apiKeys: [base64Key] },
        loggingSystemMock.create().get(),
        savedObjectsClient
      );

      const savedObjects = savedObjectsClient.bulkCreate.mock
        .calls[0][0] as Array<{ attributes: { apiKeyId: string; uiamApiKey?: string } }>;
      expect(savedObjects).toHaveLength(1);
      expect(savedObjects[0].attributes.apiKeyId).toBe('es-api-key-id-only');
      expect(savedObjects[0].attributes).not.toHaveProperty('uiamApiKey');
    });
  });

  describe('error handling', () => {
    it('logs error and does not throw when bulkCreate fails', async () => {
      const e = new Error('Fail');
      const logger = loggingSystemMock.create().get();
      const savedObjectsClient = savedObjectsClientMock.create();
      savedObjectsClient.bulkCreate.mockRejectedValueOnce(e);

      await expect(
        bulkMarkApiKeysForInvalidation(
          {
            apiKeys: [Buffer.from('123').toString('base64'), Buffer.from('456').toString('base64')],
          },
          logger,
          savedObjectsClient
        )
      ).resolves.toBeUndefined();

      expect(logger.error).toHaveBeenCalledWith(
        'Failed to bulk mark list of API keys ["MTIz", "NDU2"] for invalidation: Fail',
        { error: { stack_trace: e.stack } }
      );
    });
  });
});
