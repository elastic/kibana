/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import { httpServerMock, httpServiceMock } from '@kbn/core-http-server-mocks';
import { mockAuthenticatedUser } from '@kbn/core-security-common/mocks';
import { securityMock } from '@kbn/security-plugin/server/mocks';
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
  const security = securityMock.createStart();

  http.basePath.get.mockReturnValue('/s/default');

  security.authc.getCurrentUser.mockReturnValue(
    mockAuthenticatedUser({ username: 'elastic', profile_uid: 'elastic_profile_uid' })
  );

  const rulesClient = new RulesClient(
    request,
    http,
    rulesSavedObjectService,
    taskManager,
    security
  );

  return { rulesClient, mockSavedObjectsClient };
}
