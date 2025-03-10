/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const mockRuleType = {
  id: 'test_rule_type',
  iconClass: 'test',
  description: 'Rule when testing',
  documentationUrl: 'https://localhost.local/docs',
  validate: () => {
    return { errors: {} };
  },
  ruleParamsExpression: () => null,
  requiresAppContext: false,
};

export const getRuleTypeRegistry = () => {
  return {
    has: () => true,
    register: () => {},
    get: () => {
      return mockRuleType;
    },
    list: () => {
      return [mockRuleType];
    },
  };
};
