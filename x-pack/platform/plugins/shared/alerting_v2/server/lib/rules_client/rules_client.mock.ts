/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { ActionPolicyClient } from '../action_policy_client';
import { createRulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import { createUserService } from '../services/user_service/user_service.mock';
import type { RuleChangeHistoryServiceContract } from '../rule_change_history';
import { RulesClient } from './rules_client';

const createRuleChangeHistoryServiceMock = (): RuleChangeHistoryServiceContract => ({
  getScope: jest.fn(),
  isPluginConfigEnabled: jest.fn().mockReturnValue(false),
  isPackageEnabled: jest.fn().mockReturnValue(false),
  isEnabled: jest.fn().mockReturnValue(false),
  isInitialized: jest.fn().mockReturnValue(false),
  initialize: jest.fn(),
  getClient: jest.fn(),
  getHistory: jest.fn(),
  logRuleChanges: jest.fn().mockResolvedValue(undefined),
});

export function createRulesClient(): {
  rulesClient: RulesClient;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
} {
  const { rulesSavedObjectService, mockSavedObjectsClient } = createRulesSavedObjectService();
  const request = httpServerMock.createKibanaRequest();
  const taskManager = taskManagerMock.createStart();
  const { userService } = createUserService();
  const actionPolicyClient = {
    deleteActionPoliciesByFilter: jest
      .fn()
      .mockResolvedValue({ processed: 0, total: 0, errors: [] }),
  } as unknown as ActionPolicyClient;

  const rulesClient = new RulesClient({
    services: {
      request,
      rulesSavedObjectService,
      taskManager,
      userService,
      actionPolicyClient,
      ruleChangeHistoryService: createRuleChangeHistoryServiceMock(),
    },
    options: { spaceId: 'default' },
  });

  return { rulesClient, mockSavedObjectsClient };
}
