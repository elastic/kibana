/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentDefinition } from '@kbn/agent-builder-common';
import { AgentType } from '@kbn/agent-builder-common';
import type { AgentsServiceStart, AgentRegistry } from '../services/agents';
import type { InternalAgentDefinition } from '../services/agents/agent_registry';

export type MockedAgent = jest.Mocked<AgentDefinition>;
export type MockedInternalAgent = jest.Mocked<InternalAgentDefinition>;
export type AgentsServiceStartMock = jest.Mocked<AgentsServiceStart>;
export type AgentRegistryMock = jest.Mocked<AgentRegistry>;

export const createMockedAgentRegistry = (): AgentRegistryMock => {
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
    readonly: false,
    ...parts,
  };
};

export const createMockedInternalAgent = (
  parts: Partial<InternalAgentDefinition> = {}
): MockedInternalAgent => {
  return {
    type: AgentType.chat,
    id: 'test_agent',
    name: 'Test Agent',
    description: 'My test agent',
    configuration: {
      tools: [],
    },
    readonly: false,
    isAvailable: jest.fn() as any,
    ...parts,
  };
};

export const createAgentsServiceStartMock = (): AgentsServiceStartMock => {
  return {
    execute: jest.fn(),
    getRegistry: jest.fn().mockImplementation(() => createMockedAgentRegistry()),
  };
};
