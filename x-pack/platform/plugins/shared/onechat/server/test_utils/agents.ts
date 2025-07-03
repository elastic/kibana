/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { AgentType } from '@kbn/onechat-common';
import type {
  AgentRegistry,
  AgentDefinition,
  ConversationalAgentHandlerFn,
  AgentProvider,
} from '@kbn/onechat-server';
import type { AgentsServiceStart, InternalAgentRegistry } from '../services/agents';
import type { AgentProfileClient, AgentProfileService } from '../services/agents/profiles';

export type AgentProviderMock = jest.Mocked<AgentProvider> & {
  id: string;
};
export type AgentRegistryMock = jest.Mocked<AgentRegistry>;
export type InternalAgentRegistryMock = jest.Mocked<InternalAgentRegistry>;
export type AgentsServiceStartMock = AgentsServiceStart & {
  registry: InternalAgentRegistryMock;
};

export type MockedAgent = Omit<AgentDefinition, 'handler'> & {
  handler: jest.MockedFn<ConversationalAgentHandlerFn>;
  providerId: string;
};
export type AgentProfileClientMock = jest.Mocked<AgentProfileClient>;
export type AgentProfileServiceMock = jest.Mocked<AgentProfileService>;

export const createMockedAgentProfileService = (): AgentProfileServiceMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
  };
};

export const createMockedAgentProfileClient = (): AgentProfileClientMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    list: jest.fn(),
    delete: jest.fn(),
  };
};

export const createMockedAgent = (parts: Partial<MockedAgent> = {}): MockedAgent => {
  return {
    type: AgentType.conversational,
    id: 'test_agent',
    providerId: 'provider_id',
    description: 'My test agent',
    handler: jest.fn().mockReturnValue({ result: 'result' }),
    ...parts,
  };
};

export const createAgentProviderMock = (id = 'test_provider'): AgentProviderMock => {
  return {
    id,
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };
};

export const createAgentRegistryMock = (): AgentRegistryMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
  };
};

export const createInternalAgentRegistryMock = (): InternalAgentRegistryMock => {
  return {
    has: jest.fn(),
    get: jest.fn(),
    list: jest.fn(),
    asPublicRegistry: jest.fn().mockImplementation(() => createAgentRegistryMock()),
  };
};

export const createAgentsServiceStartMock = (): AgentsServiceStartMock => {
  return {
    registry: createInternalAgentRegistryMock(),
    execute: jest.fn(),
    getProfileService: jest.fn().mockImplementation(() => createMockedAgentProfileService()),
  };
};
