/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createAgentProviderMock, createMockedAgent } from '../../../test_utils';
import { combineAgentProviders } from './combine_providers';
import { httpServerMock } from '@kbn/core-http-server-mocks';

describe('combineAgentProviders', () => {
  let mockRequest: ReturnType<typeof httpServerMock.createKibanaRequest>;

  beforeEach(() => {
    mockRequest = httpServerMock.createKibanaRequest();
  });

  it('should return an agent from the first provider that has it', async () => {
    const agent1 = createMockedAgent({ id: 'agent1', providerId: 'provider1' });
    const agent2 = createMockedAgent({ id: 'agent2', providerId: 'provider2' });
    const provider1 = createAgentProviderMock('provider1');
    provider1.has.mockImplementation(async ({ agentId }) =>
      (agentId as any).id ? (agentId as any).id === 'agent1' : agentId === 'agent1'
    );
    provider1.get.mockImplementation(async () => agent1);
    provider1.list.mockResolvedValue([agent1]);
    const provider2 = createAgentProviderMock('provider2');
    provider2.has.mockImplementation(async ({ agentId }) =>
      (agentId as any).id ? (agentId as any).id === 'agent2' : agentId === 'agent2'
    );
    provider2.get.mockImplementation(async () => agent2);
    provider2.list.mockResolvedValue([agent2]);

    const combined = combineAgentProviders(provider1, provider2);
    const result = await combined.get({ agentId: 'agent1', request: mockRequest });

    expect(result.id).toBe('agent1');
    expect(result.providerId).toBe('provider1');
    expect(provider1.get).toHaveBeenCalledWith({ agentId: 'agent1', request: mockRequest });
    expect(provider2.get).not.toHaveBeenCalled();
  });

  it('should throw an error if no provider has the requested agent', async () => {
    const provider1 = createAgentProviderMock('provider1');
    provider1.has.mockResolvedValue(false);
    provider1.get.mockImplementation(() => {
      throw new Error('not found');
    });
    provider1.list.mockResolvedValue([]);
    const provider2 = createAgentProviderMock('provider2');
    provider2.has.mockResolvedValue(false);
    provider2.get.mockImplementation(() => {
      throw new Error('not found');
    });
    provider2.list.mockResolvedValue([]);
    const combined = combineAgentProviders(provider1, provider2);
    await expect(combined.get({ agentId: 'nonexistent', request: mockRequest })).rejects.toThrow(
      'Agent with id nonexistent not found'
    );
  });

  it('should combine agents from all providers', async () => {
    const agent1 = createMockedAgent({ id: 'agent1', providerId: 'provider1' });
    const agent2 = createMockedAgent({ id: 'agent2', providerId: 'provider1' });
    const agent3 = createMockedAgent({ id: 'agent3', providerId: 'provider2' });
    const provider1 = createAgentProviderMock('provider1');
    provider1.has.mockImplementation(async ({ agentId }) =>
      ['agent1', 'agent2'].includes((agentId as any).id ? (agentId as any).id : agentId)
    );
    provider1.get.mockImplementation(async ({ agentId }) => {
      const id = (agentId as any).id ? (agentId as any).id : agentId;
      const found = [agent1, agent2].find((a) => a.id === id);
      if (!found) throw new Error('not found');
      return found;
    });
    provider1.list.mockResolvedValue([agent1, agent2]);
    const provider2 = createAgentProviderMock('provider2');
    provider2.has.mockImplementation(async ({ agentId }) =>
      (agentId as any).id ? (agentId as any).id === 'agent3' : agentId === 'agent3'
    );
    provider2.get.mockImplementation(async ({ agentId }) => agent3);
    provider2.list.mockResolvedValue([agent3]);
    const combined = combineAgentProviders(provider1, provider2);
    const result = await combined.list({ request: mockRequest });
    expect(result).toHaveLength(3);
    expect(result.find((a) => a.id === 'agent1')).toBeTruthy();
    expect(result.find((a) => a.id === 'agent2')).toBeTruthy();
    expect(result.find((a) => a.id === 'agent3')).toBeTruthy();
    // ProviderId should be set correctly
    expect(result.find((a) => a.id === 'agent1')!.providerId).toBe('provider1');
    expect(result.find((a) => a.id === 'agent3')!.providerId).toBe('provider2');
  });

  it('should handle empty providers', async () => {
    const combined = combineAgentProviders();
    const result = await combined.list({ request: mockRequest });
    expect(result).toHaveLength(0);
  });

  it('should handle providers with no agents', async () => {
    const provider1 = createAgentProviderMock('provider1');
    provider1.has.mockResolvedValue(false);
    provider1.get.mockImplementation(() => {
      throw new Error('not found');
    });
    provider1.list.mockResolvedValue([]);
    const provider2 = createAgentProviderMock('provider2');
    provider2.has.mockResolvedValue(false);
    provider2.get.mockImplementation(() => {
      throw new Error('not found');
    });
    provider2.list.mockResolvedValue([]);
    const combined = combineAgentProviders(provider1, provider2);
    const result = await combined.list({ request: mockRequest });
    expect(result).toHaveLength(0);
  });

  it('should preserve agent order from providers', async () => {
    const agent1 = createMockedAgent({ id: 'agent1', providerId: 'provider1' });
    const agent2 = createMockedAgent({ id: 'agent2', providerId: 'provider1' });
    const agent3 = createMockedAgent({ id: 'agent3', providerId: 'provider2' });
    const provider1 = createAgentProviderMock('provider1');
    provider1.has.mockImplementation(async ({ agentId }) =>
      ['agent1', 'agent2'].includes((agentId as any).id ? (agentId as any).id : agentId)
    );
    provider1.get.mockImplementation(async ({ agentId }) => {
      const id = (agentId as any).id ? (agentId as any).id : agentId;
      const found = [agent1, agent2].find((a) => a.id === id);
      if (!found) throw new Error('not found');
      return found;
    });
    provider1.list.mockResolvedValue([agent1, agent2]);
    const provider2 = createAgentProviderMock('provider2');
    provider2.has.mockImplementation(async ({ agentId }) =>
      (agentId as any).id ? (agentId as any).id === 'agent3' : agentId === 'agent3'
    );
    provider2.get.mockImplementation(async ({ agentId }) => agent3);
    provider2.list.mockResolvedValue([agent3]);
    const combined = combineAgentProviders(provider1, provider2);
    const result = await combined.list({ request: mockRequest });
    expect(result.map((a) => a.id)).toEqual(['agent1', 'agent2', 'agent3']);
  });

  it('should return true for has if any provider has the agent', async () => {
    const agent1 = createMockedAgent({ id: 'agent1', providerId: 'provider1' });
    const provider1 = createAgentProviderMock('provider1');
    provider1.has.mockImplementation(async ({ agentId }) =>
      (agentId as any).id ? (agentId as any).id === 'agent1' : agentId === 'agent1'
    );
    provider1.get.mockImplementation(async ({ agentId }) => agent1);
    provider1.list.mockResolvedValue([agent1]);
    const provider2 = createAgentProviderMock('provider2');
    provider2.has.mockResolvedValue(false);
    provider2.get.mockImplementation(() => {
      throw new Error('not found');
    });
    provider2.list.mockResolvedValue([]);
    const combined = combineAgentProviders(provider1, provider2);
    await expect(combined.has({ agentId: 'agent1', request: mockRequest })).resolves.toBe(true);
    await expect(combined.has({ agentId: 'nonexistent', request: mockRequest })).resolves.toBe(
      false
    );
  });
});
