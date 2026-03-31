/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { invalidateApiKeysAndDeletePendingApiKeySavedObject } from './invalidate_api_keys_and_delete_so';

const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const invalidateApiKeyFn = jest.fn();

describe('invalidateApiKeysAndDeletePendingApiKeySavedObject', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  test('should succeed when there are no api keys to invalidate', async () => {
    const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
      apiKeyIdsToInvalidate: [],
      invalidateApiKeyFn,
      logger,
      savedObjectsClient: internalSavedObjectsRepository,
      savedObjectType: 'api_key_pending_invalidation',
    });
    expect(total).toEqual(0);
    expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "0"`);
  });

  test('should succeed when there are api keys to invalidate', async () => {
    invalidateApiKeyFn.mockResolvedValue({
      invalidated_api_keys: ['1', '2'],
      previously_invalidated_api_keys: [],
      error_count: 0,
    });
    const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
      apiKeyIdsToInvalidate: [
        { id: '1', apiKeyId: 'abcd====!' },
        { id: '2', apiKeyId: 'xyz!==!' },
      ],
      invalidateApiKeyFn,
      logger,
      savedObjectsClient: internalSavedObjectsRepository,
      savedObjectType: 'api_key_to_invalidate',
    });
    expect(invalidateApiKeyFn).toHaveBeenCalledWith({
      ids: ['abcd====!', 'xyz!==!'],
    });
    expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(2);
    expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
      1,
      'api_key_to_invalidate',
      '1'
    );
    expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
      2,
      'api_key_to_invalidate',
      '2'
    );
    expect(total).toEqual(2);
    expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "2"`);
  });

  test('should handle errors during invalidation', async () => {
    invalidateApiKeyFn.mockResolvedValueOnce({
      invalidated_api_keys: ['1'],
      previously_invalidated_api_keys: [],
      error_count: 1,
    });
    const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
      apiKeyIdsToInvalidate: [
        { id: '1', apiKeyId: 'abcd====!' },
        { id: '2', apiKeyId: 'xyz!==!' },
      ],
      invalidateApiKeyFn,
      logger,
      savedObjectsClient: internalSavedObjectsRepository,
      savedObjectType: 'api_key_pending_invalidation',
    });
    expect(invalidateApiKeyFn).toHaveBeenCalledWith({
      ids: ['abcd====!', 'xyz!==!'],
    });
    expect(internalSavedObjectsRepository.delete).not.toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalledWith(`Failed to invalidate API Keys [count=\"2\"]`);
    expect(total).toEqual(0);
    expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "0"`);
  });

  test('should handle null security plugin', async () => {
    const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
      apiKeyIdsToInvalidate: [
        { id: '1', apiKeyId: 'abcd====!' },
        { id: '2', apiKeyId: 'xyz!==!' },
      ],
      logger,
      savedObjectsClient: internalSavedObjectsRepository,
      savedObjectType: 'api_key_pending_invalidation',
    });
    expect(invalidateApiKeyFn).not.toHaveBeenCalled();
    expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(2);
    expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
      1,
      'api_key_pending_invalidation',
      '1'
    );
    expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
      2,
      'api_key_pending_invalidation',
      '2'
    );
    expect(total).toEqual(2);
    expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "2"`);
  });

  test('should handle null result from invalidateAsInternalUser', async () => {
    invalidateApiKeyFn.mockResolvedValueOnce(null);
    const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
      apiKeyIdsToInvalidate: [
        { id: '1', apiKeyId: 'abcd====!' },
        { id: '2', apiKeyId: 'xyz!==!' },
      ],
      invalidateApiKeyFn,
      logger,
      savedObjectsClient: internalSavedObjectsRepository,
      savedObjectType: 'api_key_to_invalidate',
    });
    expect(invalidateApiKeyFn).toHaveBeenCalledWith({
      ids: ['abcd====!', 'xyz!==!'],
    });
    expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(2);
    expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
      1,
      'api_key_to_invalidate',
      '1'
    );
    expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
      2,
      'api_key_to_invalidate',
      '2'
    );
    expect(total).toEqual(2);
    expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "2"`);
  });

  describe('UIAM API key invalidation', () => {
    const invalidateUiamApiKeyFn = jest.fn();

    beforeEach(() => {
      invalidateUiamApiKeyFn.mockReset();
    });

    test('should delete SO when UIAM invalidation succeeds', async () => {
      invalidateUiamApiKeyFn.mockResolvedValueOnce({
        invalidated_api_keys: ['uiam_key_1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });

      const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
        apiKeyIdsToInvalidate: [],
        uiamApiKeysToInvalidate: [
          { id: 'so_1', apiKeyId: 'uiam_key_1', uiamApiKey: 'essu_cred_1' },
        ],
        invalidateUiamApiKeyFn,
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        savedObjectType: 'api_key_pending_invalidation',
      });

      expect(internalSavedObjectsRepository.delete).toHaveBeenCalledWith(
        'api_key_pending_invalidation',
        'so_1'
      );
      expect(total).toEqual(1);
    });

    test('should delete SO and warn when UIAM returns APIKEY_MISSING (0x28D520)', async () => {
      invalidateUiamApiKeyFn.mockResolvedValueOnce({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 1,
        error_details: [{ type: 'exception', code: '0x28D520', reason: 'APIKEY_MISSING' }],
      });

      const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
        apiKeyIdsToInvalidate: [],
        uiamApiKeysToInvalidate: [
          { id: 'so_1', apiKeyId: 'uiam_key_1', uiamApiKey: 'essu_cred_1' },
        ],
        invalidateUiamApiKeyFn,
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        savedObjectType: 'api_key_pending_invalidation',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('UIAM APIKey is already invalidated or missing')
      );
      expect(internalSavedObjectsRepository.delete).toHaveBeenCalledWith(
        'api_key_pending_invalidation',
        'so_1'
      );
      expect(total).toEqual(1);
    });

    test('should delete SO and warn when UIAM returns APIKEY_REVOKED (0xD38358)', async () => {
      invalidateUiamApiKeyFn.mockResolvedValueOnce({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 1,
        error_details: [{ type: 'exception', code: '0xD38358', reason: 'APIKEY_REVOKED' }],
      });

      const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
        apiKeyIdsToInvalidate: [],
        uiamApiKeysToInvalidate: [
          { id: 'so_1', apiKeyId: 'uiam_key_1', uiamApiKey: 'essu_cred_1' },
        ],
        invalidateUiamApiKeyFn,
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        savedObjectType: 'api_key_pending_invalidation',
      });

      expect(logger.warn).toHaveBeenCalledWith(
        expect.stringContaining('UIAM APIKey is already invalidated or missing')
      );
      expect(internalSavedObjectsRepository.delete).toHaveBeenCalledWith(
        'api_key_pending_invalidation',
        'so_1'
      );
      expect(total).toEqual(1);
    });

    test('should NOT delete SO when UIAM returns an unknown error', async () => {
      invalidateUiamApiKeyFn.mockResolvedValueOnce({
        invalidated_api_keys: [],
        previously_invalidated_api_keys: [],
        error_count: 1,
        error_details: [{ type: 'exception', reason: 'Internal Server Error' }],
      });

      const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
        apiKeyIdsToInvalidate: [],
        uiamApiKeysToInvalidate: [
          { id: 'so_1', apiKeyId: 'uiam_key_1', uiamApiKey: 'essu_cred_1' },
        ],
        invalidateUiamApiKeyFn,
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        savedObjectType: 'api_key_pending_invalidation',
      });

      expect(logger.error).toHaveBeenCalledWith(
        expect.stringContaining('Failed to invalidate UIAM APIKey')
      );
      expect(internalSavedObjectsRepository.delete).not.toHaveBeenCalled();
      expect(total).toEqual(0);
    });

    test('should delete SO when UIAM security is disabled', async () => {
      const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
        apiKeyIdsToInvalidate: [],
        uiamApiKeysToInvalidate: [
          { id: 'so_1', apiKeyId: 'uiam_key_1', uiamApiKey: 'essu_cred_1' },
        ],
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        savedObjectType: 'api_key_pending_invalidation',
      });

      expect(internalSavedObjectsRepository.delete).toHaveBeenCalledWith(
        'api_key_pending_invalidation',
        'so_1'
      );
      expect(total).toEqual(1);
    });
  });
});
