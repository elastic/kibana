/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { EncryptedSavedObjectsClient } from '@kbn/encrypted-saved-objects-plugin/server';
import type { ActionPolicySavedObjectAttributes } from '../../../saved_objects';
import { ACTION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { ActionPolicySavedObjectService } from './action_policy_saved_object_service';
import { createActionPolicySavedObjectService } from './action_policy_saved_object_service.mock';

const mockAttrs: ActionPolicySavedObjectAttributes = {
  name: 'test-policy',
  description: 'A test action policy',
  type: 'global',
  enabled: true,
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
  auth: {
    apiKey: 'test-api-key',
    owner: 'test-user',
    createdByUser: false,
  },
  createdBy: 'elastic',
  createdByUsername: 'elastic',
  updatedBy: 'elastic',
  updatedByUsername: 'elastic',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('ActionPolicySavedObjectService', () => {
  let service: ActionPolicySavedObjectService;
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;
  let mockEncryptedSoClient: jest.Mocked<EncryptedSavedObjectsClient>;

  beforeEach(() => {
    const mocks = createActionPolicySavedObjectService();
    service = mocks.actionPolicySavedObjectService;
    mockSoClient = mocks.mockSavedObjectsClient;
    mockEncryptedSoClient = mocks.mockEncryptedSavedObjectsClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a saved object with the provided id', async () => {
      mockSoClient.create.mockResolvedValue({
        id: 'policy-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
        version: 'v1',
      });

      const result = await service.create({ attrs: mockAttrs, id: 'policy-1' });

      expect(result).toEqual({ id: 'policy-1', version: 'v1' });
      expect(mockSoClient.create).toHaveBeenCalledWith(ACTION_POLICY_SAVED_OBJECT_TYPE, mockAttrs, {
        id: 'policy-1',
        overwrite: false,
      });
    });

    it('generates an id when none is provided', async () => {
      mockSoClient.create.mockResolvedValue({
        id: expect.any(String),
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
        version: 'v1',
      });

      await service.create({ attrs: mockAttrs });

      expect(mockSoClient.create).toHaveBeenCalledWith(ACTION_POLICY_SAVED_OBJECT_TYPE, mockAttrs, {
        id: expect.any(String),
        overwrite: false,
      });
    });

    it('propagates errors from the saved objects client', async () => {
      mockSoClient.create.mockRejectedValue(new Error('conflict'));

      await expect(service.create({ attrs: mockAttrs })).rejects.toThrow('conflict');
    });
  });

  describe('get', () => {
    it('returns id, attributes, and version', async () => {
      mockSoClient.get.mockResolvedValue({
        id: 'policy-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
        version: 'v1',
      });

      const result = await service.get('policy-1');

      expect(result).toEqual({ id: 'policy-1', attributes: mockAttrs, version: 'v1' });
      expect(mockSoClient.get).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-1',
        undefined
      );
    });

    it('passes namespace when spaceId is provided', async () => {
      mockSoClient.get.mockResolvedValue({
        id: 'policy-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
        version: 'v1',
      });

      await service.get('policy-1', 'custom-space');

      expect(mockSoClient.get).toHaveBeenCalledWith(ACTION_POLICY_SAVED_OBJECT_TYPE, 'policy-1', {
        namespace: 'custom-space',
      });
    });

    it('does not pass namespace when spaceId is omitted', async () => {
      mockSoClient.get.mockResolvedValue({
        id: 'policy-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
      });

      await service.get('policy-1');

      expect(mockSoClient.get).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-1',
        undefined
      );
    });
  });

  describe('update', () => {
    it('updates the saved object and returns id and version', async () => {
      mockSoClient.update.mockResolvedValue({
        id: 'policy-1',
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
        version: 'v2',
      });

      const result = await service.update({ id: 'policy-1', attrs: mockAttrs, version: 'v1' });

      expect(result).toEqual({ id: 'policy-1', version: 'v2' });
      expect(mockSoClient.update).toHaveBeenCalledWith(
        ACTION_POLICY_SAVED_OBJECT_TYPE,
        'policy-1',
        mockAttrs,
        { version: 'v1' }
      );
    });
  });

  describe('delete', () => {
    it('deletes the saved object by id', async () => {
      mockSoClient.delete.mockResolvedValue({});

      await service.delete({ id: 'policy-1' });

      expect(mockSoClient.delete).toHaveBeenCalledWith(ACTION_POLICY_SAVED_OBJECT_TYPE, 'policy-1');
    });
  });

  describe('bulkGetByIds', () => {
    it('returns empty array when ids is empty without calling the client', async () => {
      const result = await service.bulkGetByIds([]);

      expect(result).toEqual([]);
      expect(mockSoClient.bulkGet).not.toHaveBeenCalled();
    });

    it('maps successful saved objects to id, attributes, and version', async () => {
      mockSoClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'policy-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: mockAttrs,
            references: [],
            version: 'v1',
          },
        ],
      });

      const result = await service.bulkGetByIds(['policy-1']);

      expect(result).toEqual([{ id: 'policy-1', attributes: mockAttrs, version: 'v1' }]);
      expect(mockSoClient.bulkGet).toHaveBeenCalledWith(
        [{ type: ACTION_POLICY_SAVED_OBJECT_TYPE, id: 'policy-1' }],
        undefined
      );
    });

    it('maps saved objects with errors to id and error', async () => {
      const soError = { statusCode: 404, error: 'Not Found', message: 'Not found' };
      mockSoClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'policy-missing',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as ActionPolicySavedObjectAttributes,
            references: [],
            error: soError,
          },
        ],
      });

      const result = await service.bulkGetByIds(['policy-missing']);

      expect(result).toEqual([{ id: 'policy-missing', error: soError }]);
    });

    it('handles mixed success and error results', async () => {
      const soError = { statusCode: 404, error: 'Not Found', message: 'Not found' };
      mockSoClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'policy-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: mockAttrs,
            references: [],
            version: 'v1',
          },
          {
            id: 'policy-missing',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as ActionPolicySavedObjectAttributes,
            references: [],
            error: soError,
          },
        ],
      });

      const result = await service.bulkGetByIds(['policy-1', 'policy-missing']);

      expect(result).toEqual([
        { id: 'policy-1', attributes: mockAttrs, version: 'v1' },
        { id: 'policy-missing', error: soError },
      ]);
    });

    it('passes namespace when spaceId is provided', async () => {
      mockSoClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'policy-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: mockAttrs,
            references: [],
            version: 'v1',
          },
        ],
      });

      await service.bulkGetByIds(['policy-1'], 'custom-space');

      expect(mockSoClient.bulkGet).toHaveBeenCalledWith(
        [{ type: ACTION_POLICY_SAVED_OBJECT_TYPE, id: 'policy-1' }],
        { namespace: 'custom-space' }
      );
    });
  });

  describe('bulkUpdate', () => {
    it('returns empty array when objects is empty without calling the client', async () => {
      const result = await service.bulkUpdate({ objects: [] });

      expect(result).toEqual([]);
      expect(mockSoClient.bulkUpdate).not.toHaveBeenCalled();
    });

    it('sends partial attributes and returns id and version for each object', async () => {
      mockSoClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: 'policy-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'v2',
          },
          {
            id: 'policy-2',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {},
            references: [],
            version: 'v3',
          },
        ],
      });

      const result = await service.bulkUpdate({
        objects: [
          { id: 'policy-1', attrs: { enabled: true } },
          { id: 'policy-2', attrs: { enabled: false } },
        ],
      });

      expect(result).toEqual([
        { id: 'policy-1', version: 'v2' },
        { id: 'policy-2', version: 'v3' },
      ]);
      expect(mockSoClient.bulkUpdate).toHaveBeenCalledWith([
        {
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-1',
          attributes: { enabled: true },
        },
        {
          type: ACTION_POLICY_SAVED_OBJECT_TYPE,
          id: 'policy-2',
          attributes: { enabled: false },
        },
      ]);
    });

    it('returns errors for failed objects', async () => {
      const soError = { statusCode: 404, error: 'Not Found', message: 'Not found' };
      mockSoClient.bulkUpdate.mockResolvedValue({
        saved_objects: [
          {
            id: 'policy-missing',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as ActionPolicySavedObjectAttributes,
            references: [],
            error: soError,
          },
        ],
      });

      const result = await service.bulkUpdate({
        objects: [{ id: 'policy-missing', attrs: { enabled: true } }],
      });

      expect(result).toEqual([{ id: 'policy-missing', error: soError }]);
    });
  });

  describe('bulkDelete', () => {
    it('returns empty array when ids is empty without calling the client', async () => {
      const result = await service.bulkDelete({ ids: [] });

      expect(result).toEqual([]);
      expect(mockSoClient.bulkDelete).not.toHaveBeenCalled();
    });

    it('deletes saved objects and returns id for each', async () => {
      mockSoClient.bulkDelete.mockResolvedValue({
        statuses: [
          {
            id: 'policy-1',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            success: true,
          },
          {
            id: 'policy-2',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            success: true,
          },
        ],
      });

      const result = await service.bulkDelete({ ids: ['policy-1', 'policy-2'] });

      expect(result).toEqual([{ id: 'policy-1' }, { id: 'policy-2' }]);
      expect(mockSoClient.bulkDelete).toHaveBeenCalledWith([
        { type: ACTION_POLICY_SAVED_OBJECT_TYPE, id: 'policy-1' },
        { type: ACTION_POLICY_SAVED_OBJECT_TYPE, id: 'policy-2' },
      ]);
    });

    it('returns errors for failed deletes', async () => {
      const soError = { statusCode: 404, error: 'Not Found', message: 'Not found' };
      mockSoClient.bulkDelete.mockResolvedValue({
        statuses: [
          {
            id: 'policy-missing',
            type: ACTION_POLICY_SAVED_OBJECT_TYPE,
            success: false,
            error: soError,
          },
        ],
      });

      const result = await service.bulkDelete({ ids: ['policy-missing'] });

      expect(result).toEqual([{ id: 'policy-missing', error: soError }]);
    });
  });

  describe('getDistinctTags', () => {
    const makeTagsAggResponse = (
      buckets: Array<{ key: string }>,
      opts?: { omitAggregations?: boolean }
    ) => {
      const base = { saved_objects: [], total: 0, per_page: 0, page: 1 };
      if (opts?.omitAggregations) return base;
      return { ...base, aggregations: { tags: { buckets } } };
    };

    it('returns tags from aggregation buckets', async () => {
      mockSoClient.find.mockResolvedValue(
        makeTagsAggResponse([{ key: 'production' }, { key: 'critical' }, { key: 'staging' }])
      );

      const result = await service.getDistinctTags();

      expect(result).toEqual(['production', 'critical', 'staging']);
      expect(mockSoClient.find).toHaveBeenCalledWith({
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        perPage: 0,
        aggs: {
          tags: {
            terms: {
              field: `${ACTION_POLICY_SAVED_OBJECT_TYPE}.attributes.tags`,
              size: 100,
              order: { _key: 'asc' },
            },
          },
        },
      });
    });

    it('passes include prefix pattern when search is provided', async () => {
      mockSoClient.find.mockResolvedValue(makeTagsAggResponse([{ key: 'production' }]));

      const result = await service.getDistinctTags({ search: 'prod' });

      expect(result).toEqual(['production']);
      expect(mockSoClient.find).toHaveBeenCalledWith({
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        perPage: 0,
        aggs: {
          tags: {
            terms: {
              field: `${ACTION_POLICY_SAVED_OBJECT_TYPE}.attributes.tags`,
              size: 100,
              order: { _key: 'asc' },
              include: 'prod.*',
            },
          },
        },
      });
    });

    it('escapes special regex characters in search', async () => {
      mockSoClient.find.mockResolvedValue(makeTagsAggResponse([]));

      await service.getDistinctTags({ search: 'test[foo' });

      expect(mockSoClient.find).toHaveBeenCalledWith(
        expect.objectContaining({
          aggs: {
            tags: {
              terms: expect.objectContaining({
                include: 'test\\[foo.*',
              }),
            },
          },
        })
      );
    });

    it('returns empty array when aggregations are missing', async () => {
      mockSoClient.find.mockResolvedValue(makeTagsAggResponse([], { omitAggregations: true }));

      const result = await service.getDistinctTags();

      expect(result).toEqual([]);
    });

    it('filters out empty bucket keys', async () => {
      mockSoClient.find.mockResolvedValue(
        makeTagsAggResponse([{ key: 'production' }, { key: '' }, { key: 'staging' }])
      );

      const result = await service.getDistinctTags();

      expect(result).toEqual(['production', 'staging']);
    });
  });

  describe('findAllDecrypted', () => {
    const mockClose = jest.fn();

    beforeEach(() => {
      jest.restoreAllMocks();
    });

    it('does not pass a filter when called without params', async () => {
      mockEncryptedSoClient.createPointInTimeFinderDecryptedAsInternalUser.mockResolvedValue({
        async *find() {},
        close: mockClose,
      } as any);

      await service.findAllDecrypted();

      expect(
        mockEncryptedSoClient.createPointInTimeFinderDecryptedAsInternalUser
      ).toHaveBeenCalledWith({
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        namespaces: ['*'],
        perPage: 1000,
      });
    });

    it('passes an enabled filter to the PIT finder when filter.enabled is provided', async () => {
      mockEncryptedSoClient.createPointInTimeFinderDecryptedAsInternalUser.mockResolvedValue({
        async *find() {},
        close: mockClose,
      } as any);

      await service.findAllDecrypted({ filter: { enabled: true } });

      expect(
        mockEncryptedSoClient.createPointInTimeFinderDecryptedAsInternalUser
      ).toHaveBeenCalledWith({
        type: ACTION_POLICY_SAVED_OBJECT_TYPE,
        namespaces: ['*'],
        perPage: 1000,
        filter: `${ACTION_POLICY_SAVED_OBJECT_TYPE}.attributes.enabled: true`,
      });
    });

    it('returns attributes and namespaces for successful documents', async () => {
      mockEncryptedSoClient.createPointInTimeFinderDecryptedAsInternalUser.mockResolvedValue({
        async *find() {
          yield {
            saved_objects: [
              { id: 'p1', attributes: mockAttrs, namespaces: ['default'], references: [] },
            ],
          };
        },
        close: mockClose,
      } as any);

      const result = await service.findAllDecrypted();

      expect(result).toEqual([{ id: 'p1', attributes: mockAttrs, namespaces: ['default'] }]);
      expect(mockClose).toHaveBeenCalled();
    });

    it('returns errors for documents that failed decryption', async () => {
      const soError = { statusCode: 500, error: 'Error', message: 'Decryption failed' };
      mockEncryptedSoClient.createPointInTimeFinderDecryptedAsInternalUser.mockResolvedValue({
        async *find() {
          yield {
            saved_objects: [{ id: 'p1', error: soError, attributes: {}, references: [] }],
          };
        },
        close: mockClose,
      } as any);

      const result = await service.findAllDecrypted();

      expect(result).toEqual([{ id: 'p1', error: soError }]);
    });
  });
});
