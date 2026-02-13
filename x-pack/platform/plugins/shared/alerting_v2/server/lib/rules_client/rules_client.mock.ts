/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { createUserService } from '../services/user_service/user_service.mock';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import { RulesClient } from './rules_client';
import { createRulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service.mock';

export function createRulesClient(): {
  rulesClient: RulesClient;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
} {
  const { rulesSavedObjectService, mockSavedObjectsClient } = createRulesSavedObjectService();
  const request = httpServerMock.createKibanaRequest();
  const http = httpServiceMock.createStartContract();
  const taskManager = taskManagerMock.createStart();
  const { userService } = createUserService();

  http.basePath.get.mockReturnValue('/s/default');

  const rulesClient = new RulesClient(
    request,
    http,
    rulesSavedObjectService,
    taskManager,
    userService
  );

  return { rulesClient, mockSavedObjectsClient };
}
