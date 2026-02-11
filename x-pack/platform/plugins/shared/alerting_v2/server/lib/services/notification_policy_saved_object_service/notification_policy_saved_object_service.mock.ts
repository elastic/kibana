/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { NotificationPolicySavedObjectService } from './notification_policy_saved_object_service';

export function createNotificationPolicySavedObjectService(): {
  notificationPolicySavedObjectService: NotificationPolicySavedObjectService;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
} {
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const mockSavedObjectsClientFactory = jest.fn().mockReturnValue(mockSavedObjectsClient);
  const mockSpaces = spacesMock.createStart();

  const notificationPolicySavedObjectService = new NotificationPolicySavedObjectService(
    mockSavedObjectsClientFactory,
    mockSpaces
  );

  return { notificationPolicySavedObjectService, mockSavedObjectsClient };
}
