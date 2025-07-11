/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnechatPluginSetup, OnechatPluginStart } from './types';
import { createMockedExecutableTool, createToolRegistryMock } from './test_utils/tools';
import { createMockedAgentClient } from './test_utils/agents';

const createSetupContractMock = (): jest.Mocked<OnechatPluginSetup> => {
  return {
    tools: {
      register: jest.fn(),
    },
  };
};

const createStartContractMock = (): jest.Mocked<OnechatPluginStart> => {
  return {
    tools: {
      execute: jest.fn(),
      getRegistry: jest.fn().mockImplementation(() => createToolRegistryMock()),
    },
    agents: {
      execute: jest.fn(),
      getScopedClient: jest.fn().mockImplementation(() => createMockedAgentClient()),
    },
  };
};

export const onechatMocks = {
  createSetup: createSetupContractMock,
  createStart: createStartContractMock,
  createTool: createMockedExecutableTool,
};
