/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { NotificationPolicySavedObjectAttributes } from '../../../saved_objects';
import { NOTIFICATION_POLICY_SAVED_OBJECT_TYPE } from '../../../saved_objects';
import type { NotificationPolicySavedObjectService } from './notification_policy_saved_object_service';
import { createNotificationPolicySavedObjectService } from './notification_policy_saved_object_service.mock';

const mockAttrs: NotificationPolicySavedObjectAttributes = {
  name: 'test-policy',
  description: 'A test notification policy',
  destinations: [{ type: 'workflow', id: 'workflow-1' }],
  auth: {
    apiKey: 'test-api-key',
    owner: 'test-user',
    createdByUser: false,
  },
  createdBy: 'elastic',
  updatedBy: 'elastic',
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
};

describe('NotificationPolicySavedObjectService', () => {
  let service: NotificationPolicySavedObjectService;
  let mockSoClient: jest.Mocked<SavedObjectsClientContract>;

  beforeEach(() => {
    const mocks = createNotificationPolicySavedObjectService();
    service = mocks.notificationPolicySavedObjectService;
    mockSoClient = mocks.mockSavedObjectsClient;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates a saved object with the provided id', async () => {
      mockSoClient.create.mockResolvedValue({
        id: 'policy-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
        version: 'v1',
      });

      const result = await service.create({ attrs: mockAttrs, id: 'policy-1' });

      expect(result).toEqual({ id: 'policy-1', version: 'v1' });
      expect(mockSoClient.create).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        mockAttrs,
        { id: 'policy-1', overwrite: false }
      );
    });

    it('generates an id when none is provided', async () => {
      mockSoClient.create.mockResolvedValue({
        id: expect.any(String),
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
        version: 'v1',
      });

      await service.create({ attrs: mockAttrs });

      expect(mockSoClient.create).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        mockAttrs,
        { id: expect.any(String), overwrite: false }
      );
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
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
        version: 'v1',
      });

      const result = await service.get('policy-1');

      expect(result).toEqual({ id: 'policy-1', attributes: mockAttrs, version: 'v1' });
      expect(mockSoClient.get).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-1',
        undefined
      );
    });

    it('passes namespace when spaceId is provided', async () => {
      mockSoClient.get.mockResolvedValue({
        id: 'policy-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
        version: 'v1',
      });

      await service.get('policy-1', 'custom-space');

      expect(mockSoClient.get).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-1',
        { namespace: 'custom-space' }
      );
    });

    it('does not pass namespace when spaceId is omitted', async () => {
      mockSoClient.get.mockResolvedValue({
        id: 'policy-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
      });

      await service.get('policy-1');

      expect(mockSoClient.get).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-1',
        undefined
      );
    });
  });

  describe('update', () => {
    it('updates the saved object and returns id and version', async () => {
      mockSoClient.update.mockResolvedValue({
        id: 'policy-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: mockAttrs,
        references: [],
        version: 'v2',
      });

      const result = await service.update({ id: 'policy-1', attrs: mockAttrs, version: 'v1' });

      expect(result).toEqual({ id: 'policy-1', version: 'v2' });
      expect(mockSoClient.update).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
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

      expect(mockSoClient.delete).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-1'
      );
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
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: mockAttrs,
            references: [],
            version: 'v1',
          },
        ],
      });

      const result = await service.bulkGetByIds(['policy-1']);

      expect(result).toEqual([{ id: 'policy-1', attributes: mockAttrs, version: 'v1' }]);
      expect(mockSoClient.bulkGet).toHaveBeenCalledWith(
        [{ type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, id: 'policy-1' }],
        undefined
      );
    });

    it('maps saved objects with errors to id and error', async () => {
      const soError = { statusCode: 404, error: 'Not Found', message: 'Not found' };
      mockSoClient.bulkGet.mockResolvedValue({
        saved_objects: [
          {
            id: 'policy-missing',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as NotificationPolicySavedObjectAttributes,
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
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: mockAttrs,
            references: [],
            version: 'v1',
          },
          {
            id: 'policy-missing',
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: {} as NotificationPolicySavedObjectAttributes,
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
            type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
            attributes: mockAttrs,
            references: [],
            version: 'v1',
          },
        ],
      });

      await service.bulkGetByIds(['policy-1'], 'custom-space');

      expect(mockSoClient.bulkGet).toHaveBeenCalledWith(
        [{ type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE, id: 'policy-1' }],
        { namespace: 'custom-space' }
      );
    });
  });
});
