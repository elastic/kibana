/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

function createRuleResultServiceMock() {
  return jest.fn().mockImplementation(() => {
    return {
      getLastRunErrors: jest.fn(),
      getLastRunOutcomeMessage: jest.fn(),
      getLastRunResults: jest.fn(),
      getLastRunSetters: jest.fn(),
      getLastRunWarnings: jest.fn(),
    };
  });
}

function createPublicRuleResultServiceMock() {
  return jest.fn().mockImplementation(() => {
    return {
      addLastRunError: jest.fn(),
      addLastRunWarning: jest.fn(),
      setLastRunOutcomeMessage: jest.fn(),
    };
  });
}

export const ruleResultServiceMock = {
  create: createRuleResultServiceMock(),
};

export const publicRuleResultServiceMock = {
  create: createPublicRuleResultServiceMock(),
};
