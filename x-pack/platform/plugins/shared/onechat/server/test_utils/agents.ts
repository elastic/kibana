/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AgentRegistry } from '@kbn/onechat-server';
import type { AgentsServiceStart, InternalAgentRegistry } from '../services/agents';

export type AgentRegistryMock = jest.Mocked<AgentRegistry>;
export type InternalAgentRegistryMock = jest.Mocked<InternalAgentRegistry>;
export type AgentsServiceStartMock = AgentsServiceStart & {
  registry: InternalAgentRegistryMock;
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
  };
};
