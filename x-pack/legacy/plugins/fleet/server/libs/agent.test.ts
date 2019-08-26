/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentLib } from './agent';
import { TokenLib } from './token';
import { InMemoryAgentAdapter } from './adapters/agent/in_memory';
import { Agent } from './adapters/agent/adapter_type';
import { TokenAdapter } from './adapters/tokens/default';
import { FrameworkLib } from './framework';

jest.mock('./token');

describe('Agent lib', () => {
  describe('Enroll', () => {
    it('Should throw if the enrollment token is not valid', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const agentLib = new AgentLib(agentAdapter, token);

      let error: Error | null = null;
      try {
        await agentLib.enroll(
          'not-a-valid-enrollment-token',
          'PERMANENT',
          {
            id: 'config-id-1',
            sharedId: 'config-shared-id-1',
          },
          undefined,
          'agent-1'
        );
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect((error as Error).message).toBe('Enrollment token is not valid: token does not exists');
    });

    it('Should enroll a new PERMANENT agent', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const agentLib = new AgentLib(agentAdapter, token);

      const agent = await agentLib.enroll(
        'valid-enrollment-token',
        'PERMANENT',
        {
          id: 'config-id-1',
          sharedId: 'config-shared-id-1',
        },
        undefined,
        'agent-1'
      );

      expect(agent).toBeDefined();
      expect(agent).toMatchObject({
        access_token: 'mock-access-token-1',
        config_id: 'config-id-1',
        config_shared_id: 'config-shared-id-1',
      });
    });

    it('Should allow to enroll a new PERMANENT agent again if this agent is active', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const agentLib = new AgentLib(agentAdapter, token);

      const agent1 = await agentLib.enroll(
        'valid-enrollment-token',
        'PERMANENT',
        {
          id: 'config-id-1',
          sharedId: 'config-shared-id-1',
        },
        undefined,
        'agent-1'
      );

      // Desactivate this agent
      agentAdapter.agents[agent1.id].active = false;

      const agent2 = await agentLib.enroll(
        'valid-enrollment-token',
        'PERMANENT',
        {
          id: 'config-id-1',
          sharedId: 'config-shared-id-1',
        },
        undefined,
        'agent-1'
      );

      expect(agent2).toBeDefined();
      expect(agent2).toMatchObject({
        access_token: 'mock-access-token-2',
      });
    });

    it('Should not enroll a new PERMANENT agent if this agent is already active', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const agentLib = new AgentLib(agentAdapter, token);

      await agentLib.enroll(
        'valid-enrollment-token',
        'PERMANENT',
        {
          id: 'config-id-1',
          sharedId: 'config-shared-id-1',
        },
        undefined,
        'agent-1'
      );
      let error: Error | null = null;

      try {
        await agentLib.enroll(
          'valid-enrollment-token',
          'PERMANENT',
          {
            id: 'config-id-1',
            sharedId: 'config-shared-id-1',
          },
          undefined,
          'agent-1'
        );
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect((error as Error).message).toBe('Impossible to enroll an already active agent');
    });

    it('Should enroll a new EPHEMERAL_INSTANCE agent', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const agentLib = new AgentLib(agentAdapter, token);

      const agent = await agentLib.enroll(
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
        {
          id: 'config-id-1',
          sharedId: 'config-shared-id-1',
        },
        undefined
      );

      expect(agent).toBeDefined();
      expect(agent).toMatchObject({
        access_token: 'mock-access-token-1',
        config_id: 'config-id-1',
        config_shared_id: 'config-shared-id-1',
      });
    });

    it('When enrolling a new EPHEMERAL_INSTANCE agent it should create a EPHEMERAL agent too', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const agentLib = new AgentLib(agentAdapter, token);

      const agent = await agentLib.enroll(
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
        {
          id: 'config-id-1',
          sharedId: 'config-shared-id-1',
        },
        undefined
      );

      const parentAgent = agentAdapter.agents[agent.parent_id as string];
      expect(parentAgent).toBeDefined();
      expect(parentAgent).toMatchObject({
        type: 'EPHEMERAL',
      });
    });
    it('When enrolling multiple EPHEMERAL_INSTANCE agent it should create only one EPHEMERAL agent', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const agentLib = new AgentLib(agentAdapter, token);

      const agent1 = await agentLib.enroll(
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
        {
          id: 'config-id-1',
          sharedId: 'config-shared-id-1',
        },
        undefined
      );
      const agent2 = await agentLib.enroll(
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
        {
          id: 'config-id-1',
          sharedId: 'config-shared-id-1',
        },
        undefined
      );
      expect(agent1.parent_id).toBe(agent2.parent_id);
      const parentAgent = agentAdapter.agents[agent1.parent_id as string];
      expect(parentAgent).toBeDefined();
      expect(parentAgent).toMatchObject({
        type: 'EPHEMERAL',
      });
    });
  });

  describe('Delete', () => {
    it('should delete ephemeral instances', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      agentAdapter.delete = jest.fn(async () => {});
      const agentLib = new AgentLib(agentAdapter, token);

      await agentLib.delete({
        id: 'agent:1',
        type: 'EPHEMERAL_INSTANCE',
      } as Agent);

      expect(agentAdapter.delete).toHaveBeenCalled();
    });

    it('should desactivate other agent', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      agentAdapter.update = jest.fn(async () => {});
      const agentLib = new AgentLib(agentAdapter, token);

      await agentLib.delete({
        id: 'agent:1',
        type: 'PERMANENT',
      } as Agent);

      expect(agentAdapter.update).toHaveBeenCalledWith('agent:1', {
        active: false,
      });
    });
  });

  describe('list', () => {
    it('should return all agents', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      agentAdapter.agents['agent:1'] = { id: 'agent:1' } as Agent;
      agentAdapter.agents['agent:2'] = { id: 'agent:2' } as Agent;

      const agentLib = new AgentLib(agentAdapter, token);

      const res = await agentLib.list();

      expect(res).toBeDefined();
      expect(res.total).toBe(2);
      expect(res.agents).toHaveLength(2);
    });
  });
});
