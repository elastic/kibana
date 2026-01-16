/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RulesSavedObjectServiceContract } from './rules_saved_object_service';

export function createMockRulesSavedObjectService() {
  type RulesSavedObjectServiceMock = jest.Mocked<RulesSavedObjectServiceContract>;
  const rulesSavedObjectService = {
    create: jest.fn() as jest.MockedFunction<RulesSavedObjectServiceContract['create']>,
    get: jest.fn() as jest.MockedFunction<RulesSavedObjectServiceContract['get']>,
    update: jest.fn() as jest.MockedFunction<RulesSavedObjectServiceContract['update']>,
    delete: jest.fn() as jest.MockedFunction<RulesSavedObjectServiceContract['delete']>,
    find: jest.fn() as jest.MockedFunction<RulesSavedObjectServiceContract['find']>,
  } satisfies RulesSavedObjectServiceMock;

  return rulesSavedObjectService;
}
