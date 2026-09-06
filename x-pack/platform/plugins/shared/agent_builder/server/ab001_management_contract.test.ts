/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

interface ManagementContract {
  createOrUpdateAgent: (opts: {
    spaceId: string;
    agent: { id: string; name: string; instructions: string };
    availability?: unknown;
  }) => Promise<void>;
  deleteAgent: (opts: { agentId: string; spaceId: string }) => Promise<boolean>;
}

describe('AB-001: AgentBuilderManagementSetup contract', () => {
  describe('interface shape', () => {
    it('exposes createOrUpdateAgent', () => {
      const management: ManagementContract = {
        createOrUpdateAgent: jest.fn(),
        deleteAgent: jest.fn(),
      };
      expect(typeof management.createOrUpdateAgent).toBe('function');
    });

    it('exposes deleteAgent', () => {
      const management: ManagementContract = {
        createOrUpdateAgent: jest.fn(),
        deleteAgent: jest.fn(),
      };
      expect(typeof management.deleteAgent).toBe('function');
    });
  });

  describe('createOrUpdateAgent', () => {
    it('calls ensure with the provided args', async () => {
      const ensure = jest.fn().mockResolvedValue(undefined);
      const management: ManagementContract = {
        createOrUpdateAgent: async (opts) => {
          await ensure(opts);
        },
        deleteAgent: jest.fn(),
      };

      await management.createOrUpdateAgent({
        spaceId: 'default',
        agent: { id: 'test-agent', name: 'Test', instructions: 'test' },
      });

      expect(ensure).toHaveBeenCalledWith({
        spaceId: 'default',
        agent: expect.objectContaining({ id: 'test-agent' }),
      });
    });
  });

  describe('deleteAgent', () => {
    it('calls registry delete with the agent ID', async () => {
      const deleteFn = jest.fn().mockResolvedValue(true);
      const management: ManagementContract = {
        createOrUpdateAgent: jest.fn(),
        deleteAgent: async (opts) => {
          return deleteFn(opts);
        },
      };

      const result = await management.deleteAgent({ agentId: 'test-agent', spaceId: 'default' });

      expect(result).toBe(true);
      expect(deleteFn).toHaveBeenCalledWith({ agentId: 'test-agent', spaceId: 'default' });
    });
  });
});
