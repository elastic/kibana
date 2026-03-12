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
  test('should not call savedObjectsClient bulkCreate if list of apiKeys is empty', async () => {
    const savedObjectsClient = savedObjectsClientMock.create();
    savedObjectsClient.bulkCreate.mockResolvedValueOnce({ saved_objects: [] });

    await bulkMarkApiKeysForInvalidation(
      { apiKeys: [] },
      loggingSystemMock.create().get(),
      savedObjectsClient
    );

    expect(savedObjectsClient.bulkCreate).not.toHaveBeenCalled();
  });

  test('should call savedObjectsClient bulkCreate with the proper params for ES API keys', async () => {
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

  test('should include uiamApiKey for UIAM credentials', async () => {
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

  test('should log error and not throw when bulkCreate fails', async () => {
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
