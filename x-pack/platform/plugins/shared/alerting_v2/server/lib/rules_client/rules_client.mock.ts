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
import type { RuleEventPublisher } from '../events/rule_event_publisher/rule_event_publisher';
import { createRulesSavedObjectService } from '../services/rules_saved_object_service/rules_saved_object_service.mock';
import { createUserService } from '../services/user_service/user_service.mock';
import { RulesClient } from './rules_client';

export function createRulesClient(): {
  rulesClient: RulesClient;
  mockSavedObjectsClient: jest.Mocked<SavedObjectsClientContract>;
  ruleEventPublisher: jest.Mocked<RuleEventPublisher>;
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
  const ruleEventPublisher = {
    emitRuleCreated: jest.fn(),
    emitRuleUpdated: jest.fn(),
    emitRuleDeleted: jest.fn(),
    emitRuleEnabled: jest.fn(),
    emitRuleDisabled: jest.fn(),
    emitAfterRuleUpdate: jest.fn(),
  } as unknown as jest.Mocked<RuleEventPublisher>;

  const rulesClient = new RulesClient(
    request,
    rulesSavedObjectService,
    taskManager,
    userService,
    actionPolicyClient,
    'default',
    ruleEventPublisher
  );

  return { rulesClient, mockSavedObjectsClient, ruleEventPublisher };
}
