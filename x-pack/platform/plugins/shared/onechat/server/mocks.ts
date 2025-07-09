/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { OnechatPluginSetup, OnechatPluginStart, ScopedToolsStart } from './types';
import {
  createMockedExecutableTool,
  createToolProviderMock,
  createScopedPublicToolRegistryMock,
} from './test_utils/tools';
import { createMockedAgentClient } from './test_utils/agents';

const createSetupContractMock = (): jest.Mocked<OnechatPluginSetup> => {
  return {
    tools: {
      register: jest.fn(),
      registerProvider: jest.fn(),
    },
  };
};

export const createScopedToolStartMock = (): jest.Mocked<ScopedToolsStart> => {
  return {
    execute: jest.fn(),
    registry: createScopedPublicToolRegistryMock(),
  };
};

const createStartContractMock = (): jest.Mocked<OnechatPluginStart> => {
  return {
    tools: {
      execute: jest.fn(),
      registry: createToolProviderMock(),
      asScoped: jest.fn().mockImplementation(() => createScopedToolStartMock()),
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
