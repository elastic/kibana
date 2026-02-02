/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core-saved-objects-server';
import type { KibanaRequest } from '@kbn/core-http-server';
import type { AuthenticatedUser } from '@kbn/core/server';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';

import {
  NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
  type NotificationPolicySavedObjectAttributes,
} from '../../saved_objects';
import { NotificationPolicyClient } from './notification_policy_client';
import { createNotificationPolicySavedObjectService } from '../services/notification_policy_saved_object_service/notification_policy_saved_object_service.mock';

describe('NotificationPolicyClient', () => {
  const request: KibanaRequest = httpServerMock.createKibanaRequest();
  const security = securityMock.createStart();
  const { notificationPolicySavedObjectService, mockSavedObjectsClient } =
    createNotificationPolicySavedObjectService();

  const baseCreateData = {
    name: 'policy-1',
    workflow_id: 'workflow-1',
  };

  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00.000Z'));
  });

  beforeEach(() => {
    jest.clearAllMocks();

    const user: AuthenticatedUser = mockAuthenticatedUser({
      username: 'elastic',
      profile_uid: 'elastic_profile_uid',
    });
    security.authc.getCurrentUser.mockReturnValue(user);

    mockSavedObjectsClient.create.mockResolvedValue({
      id: 'policy-id-default',
      type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
      attributes: baseCreateData,
      references: [],
    });
    mockSavedObjectsClient.update.mockResolvedValue({
      id: 'policy-id-default',
      type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
      attributes: baseCreateData,
      references: [],
    });
    mockSavedObjectsClient.delete.mockResolvedValue({});
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  function createClient() {
    return new NotificationPolicyClient(request, notificationPolicySavedObjectService, security);
  }

  describe('createNotificationPolicy', () => {
    it('creates a notification policy with correct attributes', async () => {
      const client = createClient();
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'policy-id-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: baseCreateData,
        references: [],
      });

      const res = await client.createNotificationPolicy({
        data: { name: 'my-policy', workflow_id: 'my-workflow' },
        options: { id: 'policy-id-1' },
      });

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'my-policy',
          workflow_id: 'my-workflow',
          createdBy: 'elastic',
          updatedBy: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        }),
        { id: 'policy-id-1', overwrite: false }
      );

      expect(res).toEqual(
        expect.objectContaining({
          id: 'policy-id-1',
          name: 'my-policy',
          workflow_id: 'my-workflow',
          createdBy: 'elastic',
          updatedBy: 'elastic',
          createdAt: '2025-01-01T00:00:00.000Z',
          updatedAt: '2025-01-01T00:00:00.000Z',
        })
      );
    });

    it('creates a notification policy without custom id', async () => {
      const client = createClient();
      mockSavedObjectsClient.create.mockResolvedValueOnce({
        id: 'auto-generated-id',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        attributes: baseCreateData,
        references: [],
      });

      const res = await client.createNotificationPolicy({
        data: { name: 'my-policy', workflow_id: 'my-workflow' },
      });

      expect(mockSavedObjectsClient.create).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        expect.objectContaining({
          name: 'my-policy',
          workflow_id: 'my-workflow',
        }),
        expect.objectContaining({ overwrite: false })
      );

      expect(res.name).toBe('my-policy');
      expect(res.workflow_id).toBe('my-workflow');
    });

    it('throws 409 conflict when id already exists', async () => {
      const client = createClient();
      mockSavedObjectsClient.create.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-conflict'
        )
      );

      await expect(
        client.createNotificationPolicy({
          data: { name: 'my-policy', workflow_id: 'my-workflow' },
          options: { id: 'policy-id-conflict' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });
    });
  });

  describe('getNotificationPolicy', () => {
    it('returns a notification policy by id', async () => {
      const client = createClient();

      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'test-policy',
        workflow_id: 'test-workflow',
        createdBy: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        id: 'policy-id-get-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
      });

      const res = await client.getNotificationPolicy({ id: 'policy-id-get-1' });

      expect(mockSavedObjectsClient.get).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-get-1',
        undefined
      );
      expect(res).toEqual({
        id: 'policy-id-get-1',
        ...existingAttributes,
      });
    });

    it('throws 404 when notification policy is not found', async () => {
      const client = createClient();
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-get-404'
        )
      );

      await expect(client.getNotificationPolicy({ id: 'policy-id-get-404' })).rejects.toMatchObject(
        {
          output: { statusCode: 404 },
        }
      );
    });
  });

  describe('updateNotificationPolicy', () => {
    it('updates a notification policy successfully', async () => {
      const client = createClient();

      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'original-policy',
        workflow_id: 'original-workflow',
        createdBy: 'elastic',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        id: 'policy-id-update-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
      });

      const res = await client.updateNotificationPolicy({
        id: 'policy-id-update-1',
        data: { name: 'updated-policy', workflow_id: 'updated-workflow' },
      });

      expect(mockSavedObjectsClient.update).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-update-1',
        expect.objectContaining({
          name: 'updated-policy',
          workflow_id: 'updated-workflow',
          updatedBy: 'elastic',
          updatedAt: '2025-01-01T00:00:00.000Z',
          // Preserves original createdBy and createdAt
          createdBy: 'elastic',
          createdAt: '2024-12-01T00:00:00.000Z',
        }),
        { version: 'WzEsMV0=' }
      );

      expect(res).toEqual(
        expect.objectContaining({
          id: 'policy-id-update-1',
          name: 'updated-policy',
          workflow_id: 'updated-workflow',
          updatedAt: '2025-01-01T00:00:00.000Z',
        })
      );
    });

    it('throws 404 when notification policy is not found', async () => {
      const client = createClient();
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-update-404'
        )
      );

      await expect(
        client.updateNotificationPolicy({
          id: 'policy-id-update-404',
          data: { workflow_id: 'some-workflow' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });

    it('throws 409 conflict when version is stale', async () => {
      const client = createClient();

      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'original-policy',
        workflow_id: 'original-workflow',
        createdBy: 'elastic',
        createdAt: '2024-12-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2024-12-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        id: 'policy-id-conflict',
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
      });

      mockSavedObjectsClient.update.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createConflictError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-conflict'
        )
      );

      await expect(
        client.updateNotificationPolicy({
          id: 'policy-id-conflict',
          data: { workflow_id: 'new-workflow' },
        })
      ).rejects.toMatchObject({
        output: { statusCode: 409 },
      });
    });
  });

  describe('deleteNotificationPolicy', () => {
    it('deletes a notification policy successfully', async () => {
      const client = createClient();

      const existingAttributes: NotificationPolicySavedObjectAttributes = {
        name: 'policy-to-delete',
        workflow_id: 'workflow-to-delete',
        createdBy: 'elastic',
        createdAt: '2025-01-01T00:00:00.000Z',
        updatedBy: 'elastic',
        updatedAt: '2025-01-01T00:00:00.000Z',
      };
      mockSavedObjectsClient.get.mockResolvedValueOnce({
        attributes: existingAttributes,
        version: 'WzEsMV0=',
        id: 'policy-id-del-1',
        type: NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        references: [],
      });

      await client.deleteNotificationPolicy({ id: 'policy-id-del-1' });

      expect(mockSavedObjectsClient.delete).toHaveBeenCalledWith(
        NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
        'policy-id-del-1'
      );
    });

    it('throws 404 when notification policy is not found', async () => {
      const client = createClient();
      mockSavedObjectsClient.get.mockRejectedValueOnce(
        SavedObjectsErrorHelpers.createGenericNotFoundError(
          NOTIFICATION_POLICY_SAVED_OBJECT_TYPE,
          'policy-id-del-404'
        )
      );

      await expect(
        client.deleteNotificationPolicy({ id: 'policy-id-del-404' })
      ).rejects.toMatchObject({
        output: { statusCode: 404 },
      });
    });
  });
});
