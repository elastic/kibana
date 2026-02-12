/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from './types';
import { createMockedExecutableTool, createToolRegistryMock } from './test_utils/tools';
import { createFormatContextMock } from './test_utils/attachments';
import { createToolHandlerContextMock } from './test_utils/runner';

export type { ToolHandlerContextMock } from './test_utils/runner';

const createSetupContractMock = (): jest.Mocked<AgentBuilderPluginSetup> => {
  return {
    agents: {
      register: jest.fn(),
    },
    tools: {
      register: jest.fn(),
    },
    attachments: {
      registerType: jest.fn(),
    },
    skills: {
      register: jest.fn(),
    },
    hooks: {
      register: jest.fn(),
    },
  };
};

const createStartContractMock = (): jest.Mocked<AgentBuilderPluginStart> => {
  return {
    agents: {
      runAgent: jest.fn(),
    },
    tools: {
      execute: jest.fn(),
      getRegistry: jest.fn().mockImplementation(() => createToolRegistryMock()),
    },
  };
};

export const agentBuilderMocks = {
  createSetup: createSetupContractMock,
  createStart: createStartContractMock,
  createTool: createMockedExecutableTool,
  attachments: {
    createFormatContextMock,
  },
  tools: {
    createHandlerContext: createToolHandlerContextMock,
  },
};
