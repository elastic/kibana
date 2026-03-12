/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentBuilderPluginSetup, AgentBuilderPluginStart } from './types';
import { createMockedExecutableTool, createToolRegistryMock } from './test_utils/tools';
import { createMockedAgentRegistry } from './test_utils/agents';
import { createFormatContextMock } from './test_utils/attachments';
import { createToolHandlerContextMock } from './test_utils/runner';

export type { ToolHandlerContextMock } from './test_utils/runner';

export type AgentBuilderPluginSetupMock = jest.MockedObjectDeep<AgentBuilderPluginSetup>;

const createSetupContractMock = (): AgentBuilderPluginSetupMock => {
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

export type AgentBuilderPluginStartMock = jest.MockedObjectDeep<AgentBuilderPluginStart>;

const createStartContractMock = (): AgentBuilderPluginStartMock => {
  return {
    agents: {
      runAgent: jest.fn(),
      getRegistry: jest.fn().mockImplementation(() => createMockedAgentRegistry()),
    },
    tools: {
      execute: jest.fn(),
      getRegistry: jest.fn().mockImplementation(() => createToolRegistryMock()),
    },
    skills: {
      getRegistry: jest.fn(),
      register: jest.fn(),
      unregister: jest.fn(),
    },
    execution: {
      executeAgent: jest.fn(),
      getExecution: jest.fn(),
    },
    runtime: {
      createModelProvider: jest.fn(),
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
