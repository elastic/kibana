/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import { encryptedSavedObjectsMock } from '@kbn/encrypted-saved-objects-plugin/server/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { API_KEY_PENDING_INVALIDATION_TYPE } from '..';
import { AD_HOC_RUN_SAVED_OBJECT_TYPE } from '../saved_objects';
import {
  getFindFilter,
  getApiKeyIdsToInvalidate,
  invalidateApiKeysAndDeletePendingApiKeySavedObject,
  runInvalidate,
} from './task';

let fakeTimer: sinon.SinonFakeTimers;
const encryptedSavedObjectsClient = encryptedSavedObjectsMock.createClient();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const securityMockStart = securityMock.createStart();

const mockInvalidatePendingApiKeyObject1 = {
  id: '1',
  type: API_KEY_PENDING_INVALIDATION_TYPE,
  attributes: {
    apiKeyId: 'abcd====!',
    createdAt: '2024-04-11T17:08:44.035Z',
  },
  references: [],
};
const mockInvalidatePendingApiKeyObject2 = {
  id: '2',
  type: API_KEY_PENDING_INVALIDATION_TYPE,
  attributes: {
    apiKeyId: 'xyz!==!',
    createdAt: '2024-04-11T17:08:44.035Z',
  },
  references: [],
};

describe('Invalidate API Keys Task', () => {
  beforeAll(() => {
    fakeTimer = sinon.useFakeTimers();
  });
  beforeEach(() => {
    jest.resetAllMocks();
  });
  afterAll(() => fakeTimer.restore());

  describe('getFindFilter', () => {
    test('should build find filter with just delay', () => {
      expect(getFindFilter('2024-04-11T18:40:52.197Z')).toEqual(
        `api_key_pending_invalidation.attributes.createdAt <= "2024-04-11T18:40:52.197Z"`
      );
    });

    test('should build find filter with delay and empty excluded SO id array', () => {
      expect(getFindFilter('2024-04-11T18:40:52.197Z', [])).toEqual(
        `api_key_pending_invalidation.attributes.createdAt <= "2024-04-11T18:40:52.197Z"`
      );
    });

    test('should build find filter with delay and one excluded SO id', () => {
      expect(getFindFilter('2024-04-11T18:40:52.197Z', ['abc'])).toEqual(
        `api_key_pending_invalidation.attributes.createdAt <= "2024-04-11T18:40:52.197Z" AND NOT api_key_pending_invalidation.id: "api_key_pending_invalidation:abc"`
      );
    });

    test('should build find filter with delay and multiple excluded SO ids', () => {
      expect(getFindFilter('2024-04-11T18:40:52.197Z', ['abc', 'def'])).toEqual(
        `api_key_pending_invalidation.attributes.createdAt <= "2024-04-11T18:40:52.197Z" AND NOT api_key_pending_invalidation.id: "api_key_pending_invalidation:abc" AND NOT api_key_pending_invalidation.id: "api_key_pending_invalidation:def"`
      );
    });

    test('should handle duplicate excluded SO ids', () => {
      expect(getFindFilter('2024-04-11T18:40:52.197Z', ['abc', 'abc', 'abc', 'def'])).toEqual(
        `api_key_pending_invalidation.attributes.createdAt <= "2024-04-11T18:40:52.197Z" AND NOT api_key_pending_invalidation.id: "api_key_pending_invalidation:abc" AND NOT api_key_pending_invalidation.id: "api_key_pending_invalidation:def"`
      );
    });
  });

  describe('getApiKeyIdsToInvalidate', () => {
    test('should get decrypted api key pending invalidation saved object', async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject1
      );
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject2
      );
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 2,
        page: 1,
        per_page: 10,
        aggregations: {
          apiKeyId: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
      });

      const result = await getApiKeyIdsToInvalidate({
        apiKeySOsPendingInvalidation: {
          saved_objects: [
            {
              id: '1',
              type: API_KEY_PENDING_INVALIDATION_TYPE,
              score: 0,
              attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
            {
              id: '2',
              type: API_KEY_PENDING_INVALIDATION_TYPE,
              score: 0,
              attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
          ],
          total: 2,
          per_page: 10,
          page: 1,
        },
        encryptedSavedObjectsClient,
        savedObjectsClient: internalSavedObjectsRepository,
      });

      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 0,
        filter: `ad_hoc_run_params.attributes.apiKeyId: "abcd====!" OR ad_hoc_run_params.attributes.apiKeyId: "xyz!==!"`,
        namespaces: ['*'],
        aggs: {
          apiKeyId: {
            terms: {
              field: `ad_hoc_run_params.attributes.apiKeyId`,
              size: 100,
            },
          },
        },
      });
      expect(result).toEqual({
        apiKeyIdsToInvalidate: [
          { id: '1', apiKeyId: 'abcd====!' },
          { id: '2', apiKeyId: 'xyz!==!' },
        ],
        apiKeyIdsToExclude: [],
      });
    });

    test('should get decrypted api key pending invalidation saved object when some api keys are still in use', async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject1
      );
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject2
      );
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 2,
        page: 1,
        per_page: 10,
        aggregations: {
          apiKeyId: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'abcd====!', doc_count: 1 }],
          },
        },
      });

      const result = await getApiKeyIdsToInvalidate({
        apiKeySOsPendingInvalidation: {
          saved_objects: [
            {
              id: '1',
              type: API_KEY_PENDING_INVALIDATION_TYPE,
              score: 0,
              attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
            {
              id: '2',
              type: API_KEY_PENDING_INVALIDATION_TYPE,
              score: 0,
              attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
          ],
          total: 2,
          per_page: 10,
          page: 1,
        },
        encryptedSavedObjectsClient,
        savedObjectsClient: internalSavedObjectsRepository,
      });

      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 0,
        filter: `ad_hoc_run_params.attributes.apiKeyId: "abcd====!" OR ad_hoc_run_params.attributes.apiKeyId: "xyz!==!"`,
        namespaces: ['*'],
        aggs: {
          apiKeyId: {
            terms: {
              field: `ad_hoc_run_params.attributes.apiKeyId`,
              size: 100,
            },
          },
        },
      });
      expect(result).toEqual({
        apiKeyIdsToInvalidate: [{ id: '2', apiKeyId: 'xyz!==!' }],
        apiKeyIdsToExclude: [{ id: '1', apiKeyId: 'abcd====!' }],
      });
    });

    test('should throw error if encryptedSavedObjectsClient.getDecryptedAsInternalUser throws error', async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject1
      );
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockImplementationOnce(() => {
        throw new Error('failfail');
      });

      await expect(
        getApiKeyIdsToInvalidate({
          apiKeySOsPendingInvalidation: {
            saved_objects: [
              {
                id: '1',
                type: API_KEY_PENDING_INVALIDATION_TYPE,
                score: 0,
                attributes: {
                  apiKeyId: 'encryptedencrypted',
                  createdAt: '2024-04-11T17:08:44.035Z',
                },
                references: [],
              },
              {
                id: '2',
                type: API_KEY_PENDING_INVALIDATION_TYPE,
                score: 0,
                attributes: {
                  apiKeyId: 'encryptedencrypted',
                  createdAt: '2024-04-11T17:08:44.035Z',
                },
                references: [],
              },
            ],
            total: 2,
            per_page: 10,
            page: 1,
          },
          encryptedSavedObjectsClient,
          savedObjectsClient: internalSavedObjectsRepository,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"failfail"`);
    });

    test('should throw error if malformed savedObjectsClient.find response', async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject1
      );

      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 2,
        page: 1,
        per_page: 10,
        // missing aggregations
      });

      const result = await getApiKeyIdsToInvalidate({
        apiKeySOsPendingInvalidation: {
          saved_objects: [
            {
              id: '1',
              type: API_KEY_PENDING_INVALIDATION_TYPE,
              score: 0,
              attributes: {
                apiKeyId: 'encryptedencrypted',
                createdAt: '2024-04-11T17:08:44.035Z',
              },
              references: [],
            },
          ],
          total: 2,
          per_page: 10,
          page: 1,
        },
        encryptedSavedObjectsClient,
        savedObjectsClient: internalSavedObjectsRepository,
      });

      expect(result).toEqual({
        apiKeyIdsToInvalidate: [{ id: '1', apiKeyId: 'abcd====!' }],
        apiKeyIdsToExclude: [],
      });
    });

    test('should throw error if savedObjectsClient.find throws error', async () => {
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject1
      );
      internalSavedObjectsRepository.find.mockImplementationOnce(() => {
        throw new Error('failfail');
      });
      await expect(
        getApiKeyIdsToInvalidate({
          apiKeySOsPendingInvalidation: {
            saved_objects: [
              {
                id: '1',
                type: API_KEY_PENDING_INVALIDATION_TYPE,
                score: 0,
                attributes: {
                  apiKeyId: 'encryptedencrypted',
                  createdAt: '2024-04-11T17:08:44.035Z',
                },
                references: [],
              },
            ],
            total: 2,
            per_page: 10,
            page: 1,
          },
          encryptedSavedObjectsClient,
          savedObjectsClient: internalSavedObjectsRepository,
        })
      ).rejects.toThrowErrorMatchingInlineSnapshot(`"failfail"`);
    });
  });

  describe('invalidateApiKeysAndDeletePendingApiKeySavedObject', () => {
    test('should succeed when there are no api keys to invalidate', async () => {
      const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
        apiKeyIdsToInvalidate: [],
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        securityPluginStart: securityMockStart,
      });
      expect(total).toEqual(0);
      expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "0"`);
    });

    test('should succeed when there are api keys to invalidate', async () => {
      securityMockStart.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: ['1', '2'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
        apiKeyIdsToInvalidate: [
          { id: '1', apiKeyId: 'abcd====!' },
          { id: '2', apiKeyId: 'xyz!==!' },
        ],
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        securityPluginStart: securityMockStart,
      });
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
        ids: ['abcd====!', 'xyz!==!'],
      });
      expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(2);
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(total).toEqual(2);
      expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "2"`);
    });

    test('should handle errors during invalidation', async () => {
      securityMockStart.authc.apiKeys.invalidateAsInternalUser.mockResolvedValueOnce({
        invalidated_api_keys: ['1'],
        previously_invalidated_api_keys: [],
        error_count: 1,
      });
      const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
        apiKeyIdsToInvalidate: [
          { id: '1', apiKeyId: 'abcd====!' },
          { id: '2', apiKeyId: 'xyz!==!' },
        ],
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        securityPluginStart: securityMockStart,
      });
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
        ids: ['abcd====!', 'xyz!==!'],
      });
      expect(internalSavedObjectsRepository.delete).not.toHaveBeenCalled();
      expect(logger.error).toHaveBeenCalledWith(
        `Failed to invalidate API Keys [ids=\"abcd====!, xyz!==!\"]`
      );
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
      });
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).not.toHaveBeenCalled();
      expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(2);
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(total).toEqual(2);
      expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "2"`);
    });

    test('should handle null result from invalidateAsInternalUser', async () => {
      securityMockStart.authc.apiKeys.invalidateAsInternalUser.mockResolvedValueOnce(null);
      const total = await invalidateApiKeysAndDeletePendingApiKeySavedObject({
        apiKeyIdsToInvalidate: [
          { id: '1', apiKeyId: 'abcd====!' },
          { id: '2', apiKeyId: 'xyz!==!' },
        ],
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        securityPluginStart: securityMockStart,
      });
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
        ids: ['abcd====!', 'xyz!==!'],
      });
      expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(2);
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(total).toEqual(2);
      expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "2"`);
    });
  });

  describe('runInvalidate', () => {
    test('should succeed when there are no API keys to invalidate', async () => {
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        page: 1,
        per_page: 100,
      });
      const result = await runInvalidate({
        // @ts-expect-error
        config: { invalidateApiKeysTask: { interval: '1m', removalDelay: '1h' } },
        encryptedSavedObjectsClient,
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        security: securityMockStart,
      });
      expect(result).toEqual(0);

      expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(1);
      expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        filter: `api_key_pending_invalidation.attributes.createdAt <= "1969-12-31T23:00:00.000Z"`,
        page: 1,
        sortField: 'createdAt',
        sortOrder: 'asc',
        perPage: 100,
      });
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).not.toHaveBeenCalled();
      expect(internalSavedObjectsRepository.delete).not.toHaveBeenCalled();
    });

    test('should succeed when there are API keys to invalidate', async () => {
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            score: 0,
            attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
            references: [],
          },
          {
            id: '2',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            score: 0,
            attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
            references: [],
          },
        ],
        total: 2,
        per_page: 100,
        page: 1,
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject1
      );
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject2
      );
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 2,
        page: 1,
        per_page: 0,
        aggregations: {
          apiKeyId: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
      });
      securityMockStart.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: ['1', '2'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });

      const result = await runInvalidate({
        // @ts-expect-error
        config: { invalidateApiKeysTask: { interval: '1m', removalDelay: '1h' } },
        encryptedSavedObjectsClient,
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        security: securityMockStart,
      });
      expect(result).toEqual(2);

      expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(2);
      expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(1, {
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        filter: `api_key_pending_invalidation.attributes.createdAt <= "1969-12-31T23:00:00.000Z"`,
        page: 1,
        sortField: 'createdAt',
        sortOrder: 'asc',
        perPage: 100,
      });
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(2, {
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 0,
        filter: `ad_hoc_run_params.attributes.apiKeyId: "abcd====!" OR ad_hoc_run_params.attributes.apiKeyId: "xyz!==!"`,
        namespaces: ['*'],
        aggs: {
          apiKeyId: {
            terms: {
              field: `ad_hoc_run_params.attributes.apiKeyId`,
              size: 100,
            },
          },
        },
      });
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledTimes(1);
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
        ids: ['abcd====!', 'xyz!==!'],
      });
      expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(2);
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "2"`);
    });

    test('should succeed when there are API keys to invalidate and API keys to exclude', async () => {
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            score: 0,
            attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
            references: [],
          },
          {
            id: '2',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            score: 0,
            attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
            references: [],
          },
        ],
        total: 2,
        per_page: 100,
        page: 1,
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject1
      );
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject2
      );
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 2,
        page: 1,
        per_page: 0,
        aggregations: {
          apiKeyId: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'abcd====!', doc_count: 1 }],
          },
        },
      });
      securityMockStart.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: ['1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });

      const result = await runInvalidate({
        // @ts-expect-error
        config: { invalidateApiKeysTask: { interval: '1m', removalDelay: '1h' } },
        encryptedSavedObjectsClient,
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        security: securityMockStart,
      });
      expect(result).toEqual(1);

      expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(2);
      expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(1, {
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        filter: `api_key_pending_invalidation.attributes.createdAt <= "1969-12-31T23:00:00.000Z"`,
        page: 1,
        sortField: 'createdAt',
        sortOrder: 'asc',
        perPage: 100,
      });
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(2, {
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 0,
        filter: `ad_hoc_run_params.attributes.apiKeyId: "abcd====!" OR ad_hoc_run_params.attributes.apiKeyId: "xyz!==!"`,
        namespaces: ['*'],
        aggs: {
          apiKeyId: {
            terms: {
              field: `ad_hoc_run_params.attributes.apiKeyId`,
              size: 100,
            },
          },
        },
      });
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledTimes(1);
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledWith({
        ids: ['xyz!==!'],
      });
      expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(1);
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "1"`);
    });

    test('should succeed when there are only API keys to exclude', async () => {
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            score: 0,
            attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
            references: [],
          },
          {
            id: '2',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            score: 0,
            attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
            references: [],
          },
        ],
        total: 2,
        per_page: 100,
        page: 1,
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject1
      );
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject2
      );
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 2,
        page: 1,
        per_page: 0,
        aggregations: {
          apiKeyId: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [
              { key: 'abcd====!', doc_count: 1 },
              { key: 'xyz!==!', doc_count: 2 },
            ],
          },
        },
      });

      const result = await runInvalidate({
        // @ts-expect-error
        config: { invalidateApiKeysTask: { interval: '1m', removalDelay: '1h' } },
        encryptedSavedObjectsClient,
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        security: securityMockStart,
      });
      expect(result).toEqual(0);

      expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(2);
      expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        filter: `api_key_pending_invalidation.attributes.createdAt <= "1969-12-31T23:00:00.000Z"`,
        page: 1,
        sortField: 'createdAt',
        sortOrder: 'asc',
        perPage: 100,
      });
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 0,
        filter: `ad_hoc_run_params.attributes.apiKeyId: "abcd====!" OR ad_hoc_run_params.attributes.apiKeyId: "xyz!==!"`,
        namespaces: ['*'],
        aggs: {
          apiKeyId: {
            terms: {
              field: `ad_hoc_run_params.attributes.apiKeyId`,
              size: 100,
            },
          },
        },
      });
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).not.toHaveBeenCalled();
      expect(internalSavedObjectsRepository.delete).not.toHaveBeenCalled();
    });

    test('should succeed when there are more than PAGE_SIZE API keys to invalidate', async () => {
      // first iteration
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            score: 0,
            attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
            references: [],
          },
        ],
        total: 105,
        per_page: 100,
        page: 1,
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject1
      );
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 2,
        page: 1,
        per_page: 0,
        aggregations: {
          apiKeyId: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
      });
      securityMockStart.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: ['1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      // second iteration
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '2',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            score: 0,
            attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
            references: [],
          },
        ],
        total: 5,
        per_page: 100,
        page: 1,
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject2
      );
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 2,
        page: 1,
        per_page: 0,
        aggregations: {
          apiKeyId: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [],
          },
        },
      });
      securityMockStart.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: ['2'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });

      const result = await runInvalidate({
        // @ts-expect-error
        config: { invalidateApiKeysTask: { interval: '1m', removalDelay: '1h' } },
        encryptedSavedObjectsClient,
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        security: securityMockStart,
      });
      expect(result).toEqual(2);

      expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(4);
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledTimes(2);
      expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(2);
      expect(logger.debug).toHaveBeenCalledTimes(2);

      // first iteration
      expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(1, {
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        filter: `api_key_pending_invalidation.attributes.createdAt <= "1969-12-31T23:00:00.000Z"`,
        page: 1,
        sortField: 'createdAt',
        sortOrder: 'asc',
        perPage: 100,
      });
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(2, {
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 0,
        filter: `ad_hoc_run_params.attributes.apiKeyId: "abcd====!"`,
        namespaces: ['*'],
        aggs: {
          apiKeyId: {
            terms: {
              field: `ad_hoc_run_params.attributes.apiKeyId`,
              size: 100,
            },
          },
        },
      });
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenNthCalledWith(1, {
        ids: ['abcd====!'],
      });
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(logger.debug).toHaveBeenNthCalledWith(1, `Total invalidated API keys "1"`);

      // second iteration
      expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(3, {
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        filter: `api_key_pending_invalidation.attributes.createdAt <= "1969-12-31T23:00:00.000Z"`,
        page: 1,
        sortField: 'createdAt',
        sortOrder: 'asc',
        perPage: 100,
      });
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(4, {
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 0,
        filter: `ad_hoc_run_params.attributes.apiKeyId: "xyz!==!"`,
        namespaces: ['*'],
        aggs: {
          apiKeyId: {
            terms: {
              field: `ad_hoc_run_params.attributes.apiKeyId`,
              size: 100,
            },
          },
        },
      });
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenNthCalledWith(2, {
        ids: ['xyz!==!'],
      });
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(logger.debug).toHaveBeenNthCalledWith(2, `Total invalidated API keys "1"`);
    });

    test('should succeed when there are more than PAGE_SIZE API keys to invalidate and API keys to exclude', async () => {
      // first iteration
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [
          {
            id: '1',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            score: 0,
            attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
            references: [],
          },
          {
            id: '2',
            type: API_KEY_PENDING_INVALIDATION_TYPE,
            score: 0,
            attributes: { apiKeyId: 'encryptedencrypted', createdAt: '2024-04-11T17:08:44.035Z' },
            references: [],
          },
        ],
        total: 105,
        per_page: 100,
        page: 1,
      });
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject1
      );
      encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
        mockInvalidatePendingApiKeyObject2
      );
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 2,
        page: 1,
        per_page: 0,
        aggregations: {
          apiKeyId: {
            doc_count_error_upper_bound: 0,
            sum_other_doc_count: 0,
            buckets: [{ key: 'abcd====!', doc_count: 1 }],
          },
        },
      });
      securityMockStart.authc.apiKeys.invalidateAsInternalUser.mockResolvedValue({
        invalidated_api_keys: ['1'],
        previously_invalidated_api_keys: [],
        error_count: 0,
      });
      // second iteration
      internalSavedObjectsRepository.find.mockResolvedValueOnce({
        saved_objects: [],
        total: 0,
        per_page: 100,
        page: 1,
      });

      const result = await runInvalidate({
        // @ts-expect-error
        config: { invalidateApiKeysTask: { interval: '1m', removalDelay: '1h' } },
        encryptedSavedObjectsClient,
        logger,
        savedObjectsClient: internalSavedObjectsRepository,
        security: securityMockStart,
      });
      expect(result).toEqual(1);

      expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(3);
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenCalledTimes(1);
      expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(1);
      expect(logger.debug).toHaveBeenCalledTimes(1);

      // first iteration
      expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(1, {
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        filter: `api_key_pending_invalidation.attributes.createdAt <= "1969-12-31T23:00:00.000Z"`,
        page: 1,
        sortField: 'createdAt',
        sortOrder: 'asc',
        perPage: 100,
      });
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '1'
      );
      expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
        2,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(2, {
        type: AD_HOC_RUN_SAVED_OBJECT_TYPE,
        perPage: 0,
        filter: `ad_hoc_run_params.attributes.apiKeyId: "abcd====!" OR ad_hoc_run_params.attributes.apiKeyId: "xyz!==!"`,
        namespaces: ['*'],
        aggs: {
          apiKeyId: {
            terms: {
              field: `ad_hoc_run_params.attributes.apiKeyId`,
              size: 100,
            },
          },
        },
      });
      expect(securityMockStart.authc.apiKeys.invalidateAsInternalUser).toHaveBeenNthCalledWith(1, {
        ids: ['xyz!==!'],
      });
      expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(
        1,
        API_KEY_PENDING_INVALIDATION_TYPE,
        '2'
      );
      expect(logger.debug).toHaveBeenNthCalledWith(1, `Total invalidated API keys "1"`);

      // second iteration
      expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(3, {
        type: API_KEY_PENDING_INVALIDATION_TYPE,
        filter: `api_key_pending_invalidation.attributes.createdAt <= "1969-12-31T23:00:00.000Z" AND NOT api_key_pending_invalidation.id: "api_key_pending_invalidation:1"`,
        page: 1,
        sortField: 'createdAt',
        sortOrder: 'asc',
        perPage: 100,
      });
    });
  });
});
