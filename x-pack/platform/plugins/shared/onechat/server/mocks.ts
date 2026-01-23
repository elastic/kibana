/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OnechatPluginSetup, OnechatPluginStart } from './types';
import { createMockedExecutableTool, createToolRegistryMock } from './test_utils/tools';
import { createFormatContextMock } from './test_utils/attachments';

const createSetupContractMock = (): jest.Mocked<OnechatPluginSetup> => {
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
  };
};

const createStartContractMock = (): jest.Mocked<OnechatPluginStart> => {
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

export const onechatMocks = {
  createSetup: createSetupContractMock,
  createStart: createStartContractMock,
  createTool: createMockedExecutableTool,
  attachments: {
    createFormatContextMock,
  },
};
