/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { agentBuilderDefaultAgentId, chatAgentTypeId } from '@kbn/agent-builder-common';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import { createClient, type AgentClient } from './client';
import { createPersistedProviderFn } from './provider';

jest.mock('./client');

const createClientMock = createClient as jest.MockedFunction<typeof createClient>;

const gatedAgent = {
  id: 'gated-agent',
  type: chatAgentTypeId,
  name: 'Gated agent',
  description: 'Has availability',
  configuration: { tools: [] },
  access_control: undefined,
  created_by: undefined,
  permissions: {
    update_agent: true,
    update_access_control: true,
  },
};

const availabilityContext = {
  request: {} as never,
  spaceId: 'default',
  uiSettings: {} as never,
};

describe('persisted agent provider', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('adds the default agent id when it is missing from optimized id results', async () => {
    const ensureDefaultAgent = jest.fn().mockResolvedValue({ id: agentBuilderDefaultAgentId });
    createClientMock.mockResolvedValue({
      getIds: jest.fn().mockResolvedValue(['custom-agent']),
      ensureDefaultAgent,
    } as unknown as AgentClient);

    const providerFactory = createPersistedProviderFn({
      security: {} as never,
      elasticsearch: {} as never,
      toolsService: {} as never,
      logger: {} as never,
      availabilityByAgentId: new Map(),
    });
    const provider = await providerFactory({ request: {} as never, space: 'default' });

    await expect(provider.getIds({})).resolves.toEqual([
      'custom-agent',
      agentBuilderDefaultAgentId,
    ]);
    expect(ensureDefaultAgent).toHaveBeenCalledTimes(1);
  });

  describe('availability', () => {
    it('keeps agents available when no availability was registered for their id', async () => {
      createClientMock.mockResolvedValue({
        getWithAccess: jest.fn().mockResolvedValue(gatedAgent),
      } as unknown as AgentClient);

      const provider = await createPersistedProviderFn({
        security: {} as never,
        elasticsearch: {} as never,
        toolsService: {} as never,
        logger: {} as never,
        availabilityByAgentId: new Map(),
      })({ request: {} as never, space: 'default' });

      const agent = await provider.get(gatedAgent.id);
      await expect(agent.isAvailable(availabilityContext)).resolves.toEqual({
        status: 'available',
      });
    });

    it('honours availability registered for that agent id', async () => {
      createClientMock.mockResolvedValue({
        getWithAccess: jest.fn().mockResolvedValue(gatedAgent),
      } as unknown as AgentClient);

      const availabilityByAgentId = new Map<string, AgentAvailabilityConfig>([
        [
          gatedAgent.id,
          {
            cacheMode: 'none',
            handler: async () => ({ status: 'unavailable', reason: 'feature off' }),
          },
        ],
      ]);

      const provider = await createPersistedProviderFn({
        security: {} as never,
        elasticsearch: {} as never,
        toolsService: {} as never,
        logger: {} as never,
        availabilityByAgentId,
      })({ request: {} as never, space: 'default' });

      const agent = await provider.get(gatedAgent.id);
      await expect(agent.isAvailable(availabilityContext)).resolves.toEqual({
        status: 'unavailable',
        reason: 'feature off',
      });
    });

    it('does not apply another agent id availability to this agent', async () => {
      createClientMock.mockResolvedValue({
        getWithAccess: jest.fn().mockResolvedValue(gatedAgent),
      } as unknown as AgentClient);

      const availabilityByAgentId = new Map<string, AgentAvailabilityConfig>([
        [
          'other-agent',
          {
            cacheMode: 'none',
            handler: async () => ({ status: 'unavailable', reason: 'other' }),
          },
        ],
      ]);

      const provider = await createPersistedProviderFn({
        security: {} as never,
        elasticsearch: {} as never,
        toolsService: {} as never,
        logger: {} as never,
        availabilityByAgentId,
      })({ request: {} as never, space: 'default' });

      const agent = await provider.get(gatedAgent.id);
      await expect(agent.isAvailable(availabilityContext)).resolves.toEqual({
        status: 'available',
      });
    });
  });
});
