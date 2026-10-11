/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  agentBuilderDefaultAgentId,
  chatAgentTypeId,
  SYSTEM_USER_ID,
} from '@kbn/agent-builder-common';
import type { AgentAvailabilityConfig } from '@kbn/agent-builder-server/agents';
import { createClient, type AgentClient } from './client';
import { createPersistedProviderFn, toInternalDefinition } from './provider';

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

const makeDefinition = (
  overrides: Partial<Parameters<typeof toInternalDefinition>[0]['definition']> = {}
): Parameters<typeof toInternalDefinition>[0]['definition'] => ({
  id: 'agent-id',
  type: chatAgentTypeId,
  name: 'Agent',
  description: '',
  configuration: { tools: [] },
  access_control: undefined,
  created_by: undefined,
  permissions: { update_agent: true, update_access_control: true },
  ...overrides,
});

const toInternal = (
  overrides: Partial<Parameters<typeof toInternalDefinition>[0]['definition']> = {}
) =>
  toInternalDefinition({
    definition: makeDefinition(overrides),
    availabilityByAgentId: new Map(),
    availabilityCache: { getOrCompute: jest.fn() } as never,
  });

describe('toInternalDefinition hidden derivation', () => {
  it('chat agents created by system are NOT hidden', () => {
    const agent = toInternal({
      type: chatAgentTypeId,
      created_by: { id: undefined, username: SYSTEM_USER_ID },
    });
    expect(agent.hidden).toBe(false);
  });

  it('non-chat agents created by system ARE hidden', () => {
    const agent = toInternal({
      type: 'platform.nightshift.investigation-type',
      created_by: { id: undefined, username: SYSTEM_USER_ID },
    });
    expect(agent.hidden).toBe(true);
  });

  it('non-chat agents created by a real user are NOT hidden', () => {
    const agent = toInternal({
      type: 'platform.nightshift.investigation-type',
      created_by: { id: 'user-123', username: 'alice' },
    });
    expect(agent.hidden).toBe(false);
  });

  it('chat agents created by a real user are NOT hidden', () => {
    const agent = toInternal({
      type: chatAgentTypeId,
      created_by: { id: 'user-123', username: 'alice' },
    });
    expect(agent.hidden).toBe(false);
  });

  it('explicit hidden:true on the stored definition overrides the derivation', () => {
    const agent = toInternal({
      type: chatAgentTypeId,
      created_by: { id: 'user-123', username: 'alice' },
      hidden: true,
    });
    expect(agent.hidden).toBe(true);
  });
});

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
