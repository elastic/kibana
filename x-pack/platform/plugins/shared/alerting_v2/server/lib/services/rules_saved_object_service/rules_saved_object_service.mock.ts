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
import type { RulesSavedObjectServiceContract } from './rules_saved_object_service';

export function createRulesSavedObjectService(): {
  rulesSavedObjectService: RulesSavedObjectService;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  mockFindByIds: jest.SpyInstance;
} {
  const mockSavedObjectsClient = savedObjectsClientMock.create();
  const mockSpaces = spacesMock.createStart();

  const rulesSavedObjectService = new RulesSavedObjectService(mockSavedObjectsClient, mockSpaces);

  const mockFindByIds = jest.spyOn(rulesSavedObjectService, 'findByIds').mockResolvedValue([]);

  return { rulesSavedObjectService, mockSavedObjectsClient, mockFindByIds };
}

export type RulesSavedObjectServiceMock = jest.Mocked<RulesSavedObjectServiceContract>;

export function createRulesSavedObjectServiceMock(): RulesSavedObjectServiceMock {
  return {
    create: jest.fn().mockResolvedValue({ id: 'rule-id-default' }),
    get: jest.fn(),
    bulkGetByIds: jest.fn().mockResolvedValue([]),
    findByIds: jest.fn().mockResolvedValue([]),
    update: jest.fn().mockResolvedValue({ id: 'rule-id-default' }),
    bulkUpdate: jest.fn().mockResolvedValue([]),
    delete: jest.fn().mockResolvedValue(undefined),
    bulkDelete: jest.fn().mockResolvedValue([]),
    find: jest.fn().mockResolvedValue({ saved_objects: [], total: 0 }),
    getRuleIdsByQuery: jest.fn().mockResolvedValue([]),
    countByQuery: jest.fn().mockResolvedValue(0),
    findTags: jest.fn().mockResolvedValue([]),
    getTotalScheduledPerMinute: jest.fn().mockResolvedValue(0),
  };
}
