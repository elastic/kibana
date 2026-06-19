/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { savedObjectsClientMock } from '@kbn/core-saved-objects-api-server-mocks';
import { spacesMock } from '@kbn/spaces-plugin/server/mocks';
import { RulesSavedObjectService } from './rules_saved_object_service';

export function createRulesSavedObjectService(): {
  rulesSavedObjectService: RulesSavedObjectService;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  mockFindByIds: jest.SpyInstance;
} {
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const mockSpaces = spacesMock.createStart();

  // Default the point-in-time finder to an empty result so callers such as
  // `getTotalScheduledPerMinute` resolve without extra setup.
  mockSavedObjectsClient.createPointInTimeFinder.mockReturnValue({
    async *find() {
      // no saved objects by default
    },
    close: jest.fn().mockResolvedValue(undefined),
  } as unknown as ReturnType<SavedObjectsClientContract['createPointInTimeFinder']>);

  const rulesSavedObjectService = new RulesSavedObjectService(mockSavedObjectsClient, mockSpaces);

  const mockFindByIds = jest.spyOn(rulesSavedObjectService, 'findByIds').mockResolvedValue([]);

  return { rulesSavedObjectService, mockSavedObjectsClient, mockFindByIds };
}
