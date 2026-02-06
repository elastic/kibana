/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { loggingSystemMock, savedObjectsRepositoryMock } from '@kbn/core/server/mocks';
import type {
  EncryptedSavedObjectsClient,
  EncryptedSavedObjectsClientOptions,
} from '@kbn/encrypted-saved-objects-shared';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { runInvalidate } from './run_invalidate';

let clock: sinon.SinonFakeTimers;
const logger: ReturnType<typeof loggingSystemMock.createLogger> = loggingSystemMock.createLogger();
const internalSavedObjectsRepository = savedObjectsRepositoryMock.create();
const invalidateApiKeyFn = jest.fn();

const mockInvalidatePendingApiKeyObject1 = {
  id: '1',
  type: 'api_key_pending_invalidation',
  attributes: {
    apiKeyId: 'abcd====!',
    createdAt: '2024-04-11T17:08:44.035Z',
  },
  references: [],
};
const mockInvalidatePendingApiKeyObject2 = {
  id: '2',
  type: 'api_key_pending_invalidation',
  attributes: {
    apiKeyId: 'xyz!==!',
    createdAt: '2024-04-11T17:08:44.035Z',
  },
  references: [],
};

function createEncryptedSavedObjectsClientMock(opts?: EncryptedSavedObjectsClientOptions) {
  return {
    getDecryptedAsInternalUser: jest.fn(),
    createPointInTimeFinderDecryptedAsInternalUser: jest.fn((findOptions, deps) =>
      savedObjectsClientMock.create().createPointInTimeFinder(findOptions, deps)
    ),
  } as unknown as jest.Mocked<EncryptedSavedObjectsClient>;
}
const encryptedSavedObjectsClient = createEncryptedSavedObjectsClientMock();

describe('runInvalidate', () => {
  beforeAll(() => {
    clock = sinon.useFakeTimers(new Date('2021-01-01T12:00:00.000Z'));
  });
  afterAll(() => clock.restore());
  beforeEach(() => {
    jest.resetAllMocks();
    clock.reset();
  });

  [
    {
      type: 'api_key_pending_invalidation',
      encrypted: true,
      savedObjectTypes: [
        {
          type: 'ad_hoc_run_params',
          apiKeyAttributePath: `ad_hoc_run_params.attributes.apiKeyId`,
        },
        {
          type: 'action_task_params',
          apiKeyAttributePath: `action_task_params.attributes.apiKeyId`,
        },
      ],
    },
    {
      type: 'api_key_to_invalidate',
      encrypted: false,
      savedObjectTypes: [
        { type: 'task', apiKeyAttributePath: 'task.attributes.userScope.apiKeyId' },
      ],
    },
  ].forEach(
    ({
      type,
      encrypted,
      savedObjectTypes,
    }: {
      type: string;
      encrypted: boolean;
      savedObjectTypes: { type: string; apiKeyAttributePath: string }[];
    }) => {
      const label = `SO ${type} encrypted=${encrypted}`;
      const findApiKeyId1 = encrypted ? 'encryptedencrypted' : 'abcd====!';
      const findApiKeyId2 = encrypted ? 'encryptedencrypted' : 'xyz!==!';

      const expectedFilter = `${type}.attributes.createdAt <= "2021-01-01T11:00:00.000Z"`;

      test(`${label} - should succeed when there are no API keys to invalidate`, async () => {
        internalSavedObjectsRepository.find.mockResolvedValueOnce({
          saved_objects: [],
          total: 0,
          page: 1,
          per_page: 100,
        });
        const result = await runInvalidate({
          ...(encrypted ? { encryptedSavedObjectsClient } : {}),
          removalDelay: '1h',
          invalidateApiKeyFn,
          logger,
          savedObjectsClient: internalSavedObjectsRepository,
          savedObjectType: type,
          savedObjectTypesToQuery: savedObjectTypes,
        });
        expect(result).toEqual(0);

        expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(1);

        expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
          type,
          filter: expectedFilter,
          page: 1,
          sortField: 'createdAt',
          sortOrder: 'asc',
          perPage: 100,
        });
        expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
        expect(invalidateApiKeyFn).not.toHaveBeenCalled();
        expect(internalSavedObjectsRepository.delete).not.toHaveBeenCalled();
      });

      test(`${label} - should succeed when there are API keys to invalidate`, async () => {
        internalSavedObjectsRepository.find.mockResolvedValueOnce({
          saved_objects: [
            {
              id: '1',
              type,
              score: 0,
              attributes: { apiKeyId: findApiKeyId1, createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
            {
              id: '2',
              type,
              score: 0,
              attributes: { apiKeyId: findApiKeyId2, createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
          ],
          total: 2,
          per_page: 100,
          page: 1,
        });

        if (encrypted) {
          encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
            mockInvalidatePendingApiKeyObject1
          );
          encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
            mockInvalidatePendingApiKeyObject2
          );
        }

        savedObjectTypes.forEach(() => {
          internalSavedObjectsRepository.find.mockResolvedValueOnce({
            saved_objects: [],
            total: 1,
            page: 1,
            per_page: 10,
            aggregations: {
              apiKeyId: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            },
          });
        });

        invalidateApiKeyFn.mockResolvedValue({
          invalidated_api_keys: ['1', '2'],
          previously_invalidated_api_keys: [],
          error_count: 0,
        });

        const result = await runInvalidate({
          ...(encrypted ? { encryptedSavedObjectsClient } : {}),
          removalDelay: '1h',
          invalidateApiKeyFn,
          logger,
          savedObjectsClient: internalSavedObjectsRepository,
          savedObjectType: type,
          savedObjectTypesToQuery: savedObjectTypes,
        });

        expect(result).toEqual(2);

        expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(
          1 + savedObjectTypes.length
        );

        expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(1, {
          type,
          filter: expectedFilter,
          page: 1,
          sortField: 'createdAt',
          sortOrder: 'asc',
          perPage: 100,
        });

        if (encrypted) {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
            1,
            type,
            '1'
          );
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
            2,
            type,
            '2'
          );
        } else {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
        }

        savedObjectTypes.forEach((t) => {
          expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
            type: t.type,
            perPage: 0,
            filter: `${t.apiKeyAttributePath}: "abcd====!" OR ${t.apiKeyAttributePath}: "xyz!==!"`,
            namespaces: ['*'],
            aggs: {
              apiKeyId: {
                terms: {
                  field: t.apiKeyAttributePath,
                  size: 100,
                },
              },
            },
          });
        });

        expect(invalidateApiKeyFn).toHaveBeenCalledTimes(1);
        expect(invalidateApiKeyFn).toHaveBeenCalledWith({
          ids: ['abcd====!', 'xyz!==!'],
        });
        expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(2);
        expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(1, type, '1');
        expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(2, type, '2');
        expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "2"`);
      });

      test(`${label} - should succeed when there are API keys to invalidate and API keys to exclude`, async () => {
        internalSavedObjectsRepository.find.mockResolvedValueOnce({
          saved_objects: [
            {
              id: '1',
              type,
              score: 0,
              attributes: { apiKeyId: findApiKeyId1, createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
            {
              id: '2',
              type,
              score: 0,
              attributes: { apiKeyId: findApiKeyId2, createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
          ],
          total: 2,
          per_page: 100,
          page: 1,
        });

        if (encrypted) {
          encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
            mockInvalidatePendingApiKeyObject1
          );
          encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
            mockInvalidatePendingApiKeyObject2
          );
        }

        savedObjectTypes.forEach((t) => {
          if (t.type === 'ad_hoc_run_params' || t.type === 'task') {
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
          } else {
            internalSavedObjectsRepository.find.mockResolvedValueOnce({
              saved_objects: [],
              total: 2,
              page: 1,
              per_page: 10,
              aggregations: {
                apiKeyId: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
              },
            });
          }
        });

        invalidateApiKeyFn.mockResolvedValue({
          invalidated_api_keys: ['1'],
          previously_invalidated_api_keys: [],
          error_count: 0,
        });

        const result = await runInvalidate({
          ...(encrypted ? { encryptedSavedObjectsClient } : {}),
          removalDelay: '1h',
          invalidateApiKeyFn,
          logger,
          savedObjectsClient: internalSavedObjectsRepository,
          savedObjectType: type,
          savedObjectTypesToQuery: savedObjectTypes,
        });
        expect(result).toEqual(1);

        expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(
          1 + savedObjectTypes.length
        );

        expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(1, {
          type,
          filter: expectedFilter,
          page: 1,
          sortField: 'createdAt',
          sortOrder: 'asc',
          perPage: 100,
        });

        if (encrypted) {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
            1,
            type,
            '1'
          );
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
            2,
            type,
            '2'
          );
        }

        savedObjectTypes.forEach((t) => {
          expect(internalSavedObjectsRepository.find).toHaveBeenCalledWith({
            type: t.type,
            perPage: 0,
            filter: `${t.apiKeyAttributePath}: "abcd====!" OR ${t.apiKeyAttributePath}: "xyz!==!"`,
            namespaces: ['*'],
            aggs: {
              apiKeyId: {
                terms: {
                  field: t.apiKeyAttributePath,
                  size: 100,
                },
              },
            },
          });
        });

        expect(invalidateApiKeyFn).toHaveBeenCalledTimes(1);
        expect(invalidateApiKeyFn).toHaveBeenCalledWith({
          ids: ['xyz!==!'],
        });
        expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(1);
        expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(1, type, '2');
        expect(logger.debug).toHaveBeenCalledWith(`Total invalidated API keys "1"`);
      });

      test(`${label} - should succeed when there are only API keys to exclude`, async () => {
        internalSavedObjectsRepository.find.mockResolvedValueOnce({
          saved_objects: [
            {
              id: '1',
              type,
              score: 0,
              attributes: { apiKeyId: findApiKeyId1, createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
            {
              id: '2',
              type,
              score: 0,
              attributes: { apiKeyId: findApiKeyId2, createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
          ],
          total: 2,
          per_page: 100,
          page: 1,
        });

        if (encrypted) {
          encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
            mockInvalidatePendingApiKeyObject1
          );
          encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
            mockInvalidatePendingApiKeyObject2
          );
        }

        savedObjectTypes.forEach((t) => {
          internalSavedObjectsRepository.find.mockResolvedValueOnce({
            saved_objects: [],
            total: 1,
            page: 1,
            per_page: 10,
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
        });

        const result = await runInvalidate({
          ...(encrypted ? { encryptedSavedObjectsClient } : {}),
          removalDelay: '1h',
          invalidateApiKeyFn,
          logger,
          savedObjectsClient: internalSavedObjectsRepository,
          savedObjectType: type,
          savedObjectTypesToQuery: savedObjectTypes,
        });
        expect(result).toEqual(0);

        expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(
          1 + savedObjectTypes.length
        );

        expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(1, {
          type,
          filter: expectedFilter,
          page: 1,
          sortField: 'createdAt',
          sortOrder: 'asc',
          perPage: 100,
        });
        if (encrypted) {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
            1,
            type,
            '1'
          );
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
            2,
            type,
            '2'
          );
        }

        let N = 2;
        savedObjectTypes.forEach((t) => {
          expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(N, {
            type: t.type,
            perPage: 0,
            filter: `${t.apiKeyAttributePath}: "abcd====!" OR ${t.apiKeyAttributePath}: "xyz!==!"`,
            namespaces: ['*'],
            aggs: {
              apiKeyId: {
                terms: {
                  field: t.apiKeyAttributePath,
                  size: 100,
                },
              },
            },
          });
          N = N + 1;
        });
        expect(invalidateApiKeyFn).not.toHaveBeenCalled();
        expect(internalSavedObjectsRepository.delete).not.toHaveBeenCalled();
      });

      test(`${label} - should succeed when there are more than PAGE_SIZE API keys to invalidate`, async () => {
        // first iteration
        internalSavedObjectsRepository.find.mockResolvedValueOnce({
          saved_objects: [
            {
              id: '1',
              type,
              score: 0,
              attributes: { apiKeyId: findApiKeyId1, createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
          ],
          total: 105,
          per_page: 100,
          page: 1,
        });

        if (encrypted) {
          encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
            mockInvalidatePendingApiKeyObject1
          );
        }

        savedObjectTypes.forEach(() => {
          internalSavedObjectsRepository.find.mockResolvedValueOnce({
            saved_objects: [],
            total: 1,
            page: 1,
            per_page: 10,
            aggregations: {
              apiKeyId: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            },
          });
        });

        invalidateApiKeyFn.mockResolvedValue({
          invalidated_api_keys: ['1'],
          previously_invalidated_api_keys: [],
          error_count: 0,
        });

        // second iteration
        internalSavedObjectsRepository.find.mockResolvedValueOnce({
          saved_objects: [
            {
              id: '2',
              type,
              score: 0,
              attributes: { apiKeyId: findApiKeyId2, createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
          ],
          total: 5,
          per_page: 100,
          page: 1,
        });

        if (encrypted) {
          encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
            mockInvalidatePendingApiKeyObject2
          );
        }
        savedObjectTypes.forEach(() => {
          internalSavedObjectsRepository.find.mockResolvedValueOnce({
            saved_objects: [],
            total: 1,
            page: 1,
            per_page: 10,
            aggregations: {
              apiKeyId: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
            },
          });
        });

        invalidateApiKeyFn.mockResolvedValue({
          invalidated_api_keys: ['2'],
          previously_invalidated_api_keys: [],
          error_count: 0,
        });

        const result = await runInvalidate({
          ...(encrypted ? { encryptedSavedObjectsClient } : {}),
          removalDelay: '1h',
          invalidateApiKeyFn,
          logger,
          savedObjectsClient: internalSavedObjectsRepository,
          savedObjectType: type,
          savedObjectTypesToQuery: savedObjectTypes,
        });
        expect(result).toEqual(2);

        expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(
          2 * (1 + savedObjectTypes.length)
        );
        if (encrypted) {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
        }
        expect(invalidateApiKeyFn).toHaveBeenCalledTimes(2);
        expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(2);
        expect(logger.debug).toHaveBeenCalledTimes(2);

        // first iteration
        expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(1, {
          type,
          filter: expectedFilter,
          page: 1,
          sortField: 'createdAt',
          sortOrder: 'asc',
          perPage: 100,
        });
        if (encrypted) {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
            1,
            type,
            '1'
          );
        } else {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
        }

        let N = 2;
        savedObjectTypes.forEach((t) => {
          expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(N, {
            type: t.type,
            perPage: 0,
            filter: `${t.apiKeyAttributePath}: "abcd====!"`,
            namespaces: ['*'],
            aggs: {
              apiKeyId: {
                terms: {
                  field: t.apiKeyAttributePath,
                  size: 100,
                },
              },
            },
          });
          N = N + 1;
        });

        expect(invalidateApiKeyFn).toHaveBeenNthCalledWith(1, {
          ids: ['abcd====!'],
        });
        expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(1, type, '1');
        expect(logger.debug).toHaveBeenNthCalledWith(1, `Total invalidated API keys "1"`);

        // second iteration
        expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(N, {
          type,
          filter: expectedFilter,
          page: 1,
          sortField: 'createdAt',
          sortOrder: 'asc',
          perPage: 100,
        });
        if (encrypted) {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
            2,
            type,
            '2'
          );
        } else {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
        }

        N = N + 1;
        savedObjectTypes.forEach((t) => {
          expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(N, {
            type: t.type,
            perPage: 0,
            filter: `${t.apiKeyAttributePath}: "xyz!==!"`,
            namespaces: ['*'],
            aggs: {
              apiKeyId: {
                terms: {
                  field: t.apiKeyAttributePath,
                  size: 100,
                },
              },
            },
          });
          N = N + 1;
        });
        expect(invalidateApiKeyFn).toHaveBeenNthCalledWith(2, {
          ids: ['xyz!==!'],
        });
        expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(2, type, '2');
        expect(logger.debug).toHaveBeenNthCalledWith(2, `Total invalidated API keys "1"`);
      });

      test(`${label} - should succeed when there are more than PAGE_SIZE API keys to invalidate and API keys to exclude`, async () => {
        // first iteration
        internalSavedObjectsRepository.find.mockResolvedValueOnce({
          saved_objects: [
            {
              id: '1',
              type,
              score: 0,
              attributes: { apiKeyId: findApiKeyId1, createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
            {
              id: '2',
              type,
              score: 0,
              attributes: { apiKeyId: findApiKeyId2, createdAt: '2024-04-11T17:08:44.035Z' },
              references: [],
            },
          ],
          total: 105,
          per_page: 100,
          page: 1,
        });

        if (encrypted) {
          encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
            mockInvalidatePendingApiKeyObject1
          );
          encryptedSavedObjectsClient.getDecryptedAsInternalUser.mockResolvedValueOnce(
            mockInvalidatePendingApiKeyObject2
          );
        }

        savedObjectTypes.forEach((t) => {
          if (t.type === 'ad_hoc_run_params' || t.type === 'task') {
            internalSavedObjectsRepository.find.mockResolvedValueOnce({
              saved_objects: [],
              total: 1,
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
          } else {
            internalSavedObjectsRepository.find.mockResolvedValueOnce({
              saved_objects: [],
              total: 1,
              page: 1,
              per_page: 10,
              aggregations: {
                apiKeyId: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
              },
            });
          }
        });

        invalidateApiKeyFn.mockResolvedValue({
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
          ...(encrypted ? { encryptedSavedObjectsClient } : {}),
          removalDelay: '1h',
          invalidateApiKeyFn,
          logger,
          savedObjectsClient: internalSavedObjectsRepository,
          savedObjectType: type,
          savedObjectTypesToQuery: savedObjectTypes,
        });
        expect(result).toEqual(1);

        expect(internalSavedObjectsRepository.find).toHaveBeenCalledTimes(
          2 + savedObjectTypes.length
        );
        if (encrypted) {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenCalledTimes(2);
        } else {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
        }
        expect(invalidateApiKeyFn).toHaveBeenCalledTimes(1);
        expect(internalSavedObjectsRepository.delete).toHaveBeenCalledTimes(1);
        expect(logger.debug).toHaveBeenCalledTimes(1);

        // first iteration
        expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(1, {
          type,
          filter: expectedFilter,
          page: 1,
          sortField: 'createdAt',
          sortOrder: 'asc',
          perPage: 100,
        });
        if (encrypted) {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
            1,
            type,
            '1'
          );
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).toHaveBeenNthCalledWith(
            2,
            type,
            '2'
          );
        } else {
          expect(encryptedSavedObjectsClient.getDecryptedAsInternalUser).not.toHaveBeenCalled();
        }

        let N = 2;
        savedObjectTypes.forEach((t) => {
          expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(N, {
            type: t.type,
            perPage: 0,
            filter: `${t.apiKeyAttributePath}: "abcd====!" OR ${t.apiKeyAttributePath}: "xyz!==!"`,
            namespaces: ['*'],
            aggs: {
              apiKeyId: {
                terms: {
                  field: t.apiKeyAttributePath,
                  size: 100,
                },
              },
            },
          });
          N = N + 1;
        });
        expect(invalidateApiKeyFn).toHaveBeenNthCalledWith(1, {
          ids: ['xyz!==!'],
        });
        expect(internalSavedObjectsRepository.delete).toHaveBeenNthCalledWith(1, type, '2');
        expect(logger.debug).toHaveBeenNthCalledWith(1, `Total invalidated API keys "1"`);

        // second iteration
        const filter = expectedFilter
          ? `${expectedFilter} AND NOT ${type}.id: "${type}:1"`
          : `NOT ${type}.id: "${type}:1"`;
        expect(internalSavedObjectsRepository.find).toHaveBeenNthCalledWith(N, {
          type,
          filter,
          page: 1,
          sortField: 'createdAt',
          sortOrder: 'asc',
          perPage: 100,
        });
      });
    }
  );
});
