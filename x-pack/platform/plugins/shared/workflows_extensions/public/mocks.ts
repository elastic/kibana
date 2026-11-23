/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  WorkflowsExtensionsPublicPluginSetup,
  WorkflowsExtensionsPublicPluginStart,
} from './types';

const createSetupMock: () => jest.Mocked<WorkflowsExtensionsPublicPluginSetup> = () => {
  return {
    registerStepDefinition: jest.fn(),
    registerTriggerDefinition: jest.fn(),
  };
};

const createStartMock: () => jest.Mocked<WorkflowsExtensionsPublicPluginStart> = () => {
  return {
    getStepDefinition: jest.fn(),
    hasStepDefinition: jest.fn(),
    getAllStepDefinitions: jest.fn(() => []),
    getAllTriggerDefinitions: jest.fn(() => []),
    getTriggerDefinition: jest.fn(),
    hasTriggerDefinition: jest.fn(),
    isReady: jest.fn(() => Promise.resolve()),
  };
};

export const workflowsExtensionsMock = {
  createSetup: createSetupMock,
  createStart: createStartMock,
};
