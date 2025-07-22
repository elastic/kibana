/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentType, AgentDefinition } from '@kbn/onechat-common';
import type { AgentsServiceStart } from '../services/agents';
import type { AgentClient } from '../services/agents/client';

export type MockedAgent = jest.Mocked<AgentDefinition>;
export type AgentsServiceStartMock = jest.Mocked<AgentsServiceStart>;
export type AgentClientMock = jest.Mocked<AgentClient>;

export const createMockedAgentClient = (): AgentClientMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
  };
};

export const createMockedAgent = (parts: Partial<AgentDefinition> = {}): MockedAgent => {
  return {
    type: AgentType.chat,
    id: 'test_agent',
    name: 'Test Agent',
    description: 'My test agent',
    configuration: {
      tools: [],
    },
    ...parts,
  };
};

export const createAgentsServiceStartMock = (): AgentsServiceStartMock => {
  return {
    execute: jest.fn(),
    getScopedClient: jest.fn().mockImplementation(() => createMockedAgentClient()),
  };
};
