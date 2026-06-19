/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { createRulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import { createUserService } from '../services/user_service/user_service.mock';
import type { QueryServiceContract } from '../services/query_service/query_service';
import { RulesClient } from './rules_client';

export function createRulesClient(): {
  rulesClient: RulesClient;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
} {
  const { rulesSavedObjectService, mockSavedObjectsClient } = createRulesSavedObjectService();
  const request = httpServerMock.createKibanaRequest();
  const taskManager = taskManagerMock.createStart();
  const { userService } = createUserService();
  const queryService = {
    validateQueryExecutable: jest.fn().mockResolvedValue(undefined),
  } as unknown as jest.Mocked<QueryServiceContract>;

  const rulesClient = new RulesClient(
    request,
    rulesSavedObjectService,
    taskManager,
    userService,
    'default',
    queryService
  );

  return { rulesClient, mockSavedObjectsClient };
}
