/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentLib } from './agent';
import { TokenLib } from './token';
import { PolicyLib } from './policy';
import { InMemoryAgentsRepository } from '../repositories/agents/in_memory';
import { Agent } from '../repositories/agents/types';
import { TokensRepository } from '../repositories/tokens/types';
import { FrameworkLib } from './framework';
import { PoliciesRepository } from '../repositories/policies/default';
import { FrameworkUser } from '../adapters/framework/adapter_types';
import { InMemoryAgentEventsRepository } from '../repositories/agent_events/in_memory';

jest.mock('./token');
jest.mock('./policy');

describe('Agent lib', () => {
  function getUser() {
    return ({} as unknown) as FrameworkUser;
  }
  describe('Enroll', () => {
    it('Should throw if the enrollment token is not valid', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsRepository = new InMemoryAgentsRepository();
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      let error: Error | null = null;
      try {
        await agentLib.enroll(
          getUser(),
          'not-a-valid-enrollment-token',
          'PERMANENT',
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
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      const agent = await agentLib.enroll(
        getUser(),
        'valid-enrollment-token',
        'PERMANENT',
        undefined,
        'agent-1'
      );

      expect(agent).toBeDefined();
      expect(agent).toMatchObject({
        access_token: 'mock-access-token-1',
        policy_id: 'policyId',
      });
    });

    it('Should allow to enroll a new PERMANENT agent again if this agent is active', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      const agent1 = await agentLib.enroll(
        getUser(),
        'valid-enrollment-token',
        'PERMANENT',
        undefined,
        'agent-1'
      );

      // Desactivate this agent
      agentsRepository.agents[agent1.id].active = false;

      const agent2 = await agentLib.enroll(
        getUser(),
        'valid-enrollment-token',
        'PERMANENT',
        undefined,
        'agent-1'
      );

      expect(agent2).toBeDefined();
      expect(agent2).toMatchObject({
        access_token: 'mock-access-token-2',
      });
    });

    it('Should not enroll a new PERMANENT agent if this agent is already active', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      await agentLib.enroll(getUser(), 'valid-enrollment-token', 'PERMANENT', undefined, 'agent-1');
      let error: Error | null = null;

      try {
        await agentLib.enroll(
          getUser(),
          'valid-enrollment-token',
          'PERMANENT',
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
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      const agent = await agentLib.enroll(
        getUser(),
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
        undefined
      );

      expect(agent).toBeDefined();
      expect(agent).toMatchObject({
        access_token: 'mock-access-token-1',
        policy_id: 'policyId',
      });
    });

    it('When enrolling a new EPHEMERAL_INSTANCE agent it should create a EPHEMERAL agent too', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      const agent = await agentLib.enroll(
        getUser(),
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
        undefined
      );

      const parentAgent = agentsRepository.agents[agent.parent_id as string];
      expect(parentAgent).toBeDefined();
      expect(parentAgent).toMatchObject({
        type: 'EPHEMERAL',
      });
    });
    it('When enrolling multiple EPHEMERAL_INSTANCE agent it should create only one EPHEMERAL agent', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      const agent1 = await agentLib.enroll(
        getUser(),
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
        undefined
      );
      const agent2 = await agentLib.enroll(
        getUser(),
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
        undefined
      );
      expect(agent1.parent_id).toBe(agent2.parent_id);
      const parentAgent = agentsRepository.agents[agent1.parent_id as string];
      expect(parentAgent).toBeDefined();
      expect(parentAgent).toMatchObject({
        type: 'EPHEMERAL',
      });
    });
  });

  describe('Delete', () => {
    it('should delete ephemeral instances', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      agentsRepository.delete = jest.fn(async () => {});
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      await agentLib.delete(getUser(), {
        id: 'agent:1',
        type: 'EPHEMERAL_INSTANCE',
      } as Agent);

      expect(agentsRepository.delete).toHaveBeenCalled();
    });

    it('should desactivate other agent', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      agentsRepository.update = jest.fn(async () => {});
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      await agentLib.delete(getUser(), {
        id: 'agent:1',
        type: 'PERMANENT',
      } as Agent);

      expect(agentsRepository.update).toHaveBeenCalledWith({}, 'agent:1', {
        active: false,
      });
    });
  });

  describe('list', () => {
    it('should return all agents', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      const agentsRepository = new InMemoryAgentsRepository();
      agentsRepository.agents['agent:1'] = { id: 'agent:1' } as Agent;
      agentsRepository.agents['agent:2'] = { id: 'agent:2' } as Agent;

      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      const res = await agentLib.list(getUser());

      expect(res).toBeDefined();
      expect(res.total).toBe(2);
      expect(res.agents).toHaveLength(2);
    });
  });

  describe('checkin', () => {
    it('should throw if the agens do not exists', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      await expect(
        agentLib.checkin(getUser(), 'agent:1', [
          {
            timestamp: '2019-09-05T15:41:26+0000',
            type: 'STATE',
            subtype: 'STARTING',
            message: 'State changed from PAUSE to STARTING',
          },
        ])
      ).rejects.toThrowError(/Agent not found/);
    });

    it('should persist new events', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentsRepository = new InMemoryAgentsRepository();
      const agentsEventsRepository = new InMemoryAgentEventsRepository();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        actions: [],
        active: true,
        policy_id: 'policy:1',
      } as unknown) as Agent;
      const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, token, policy);

      await agentLib.checkin(getUser(), 'agent:1', [
        {
          timestamp: '2019-09-05T15:41:26+0000',
          type: 'STATE',
          subtype: 'STARTING',
          message: 'State changed from PAUSE to STARTING',
        },
      ]);

      const { items: events } = await agentsEventsRepository.getEventsForAgent(
        getUser(),
        'agent:1'
      );
      expect(events).toHaveLength(1);
      expect(events[0]).toMatchObject({
        timestamp: '2019-09-05T15:41:26+0000',
        type: 'STATE',
        subtype: 'STARTING',
        message: 'State changed from PAUSE to STARTING',
      });
    });

    it('should not update agent metadata if none are provided', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentEventsRepository = new InMemoryAgentEventsRepository();
      const agentRepository = new InMemoryAgentsRepository();
      agentRepository.agents['agent:1'] = ({
        id: 'agent:1',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
      } as unknown) as Agent;
      const agentLib = new AgentLib(agentRepository, agentEventsRepository, token, policy);

      await agentLib.checkin(getUser(), 'agent:1', []);

      const refreshAgent = (await agentRepository.getById(getUser(), 'agent:1')) as Agent;
      expect(refreshAgent.local_metadata).toMatchObject({
        key: 'local1',
      });
    });

    it('should return the full policy for this agent', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const policyLib = new PolicyLib({} as PoliciesRepository);
      const agentsRepository = new InMemoryAgentsRepository();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
      } as unknown) as Agent;
      const agentEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentEventsRepository, token, policyLib);

      const { policy } = await agentLib.checkin(getUser(), 'agent:1', []);

      expect(policy).toMatchObject({
        id: 'policy:1',
      });
    });

    it('should update agent metadata if provided', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      const agentEventsRepository = new InMemoryAgentEventsRepository();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
      } as unknown) as Agent;
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentLib = new AgentLib(agentsRepository, agentEventsRepository, token, policy);

      await agentLib.checkin(getUser(), 'agent:1', [], { key: 'local2' });

      const refreshAgent = (await agentsRepository.getById(getUser(), 'agent:1')) as Agent;
      expect(refreshAgent.local_metadata).toMatchObject({
        key: 'local2',
      });
    });

    it('should return new actions', async () => {
      const policy = new PolicyLib({} as PoliciesRepository);
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        active: true,
        policy_id: 'policy:1',
        actions: [
          {
            created_at: '2019-09-05T15:43:26+0000',
            type: 'PAUSE',
            id: 'this-a-unique-id',
          },
          {
            created_at: '2019-09-05T15:41:26+0000',
            type: 'PAUSE',
            sent_at: '2019-09-05T15:42:26+0000',
            id: 'this-a-unique-id-already-sent',
          },
        ],
        events: [],
      } as unknown) as Agent;
      const agentEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentEventsRepository, token, policy);
      const { actions } = await agentLib.checkin(getUser(), 'agent:1', []);

      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        type: 'PAUSE',
        id: 'this-a-unique-id',
      });

      const refreshAgent = (await agentsRepository.getById(getUser(), 'agent:1')) as Agent;
      expect(refreshAgent.actions[0].sent_at).toBeDefined();
    });
  });

  describe('addAction', () => {
    it('should throw if the agent do not exists', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      const policy = new PolicyLib({} as PoliciesRepository);
      const agentEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentEventsRepository, token, policy);

      await expect(
        agentLib.addAction(getUser(), 'agent:1', {
          type: 'PAUSE',
        })
      ).rejects.toThrowError(/Agent not found/);
    });

    it('should add the action', async () => {
      const token = new TokenLib({} as TokensRepository, {} as FrameworkLib);
      const agentsRepository = new InMemoryAgentsRepository();
      agentsRepository.agents['agent:1'] = {
        id: 'agent:1',
        actions: [],
        active: true,
        type: 'PERMANENT',
        policy_id: 'config1',
      };
      const spy = jest.spyOn(agentsRepository, 'update');

      const policy = new PolicyLib({} as PoliciesRepository);
      const agentEventsRepository = new InMemoryAgentEventsRepository();
      const agentLib = new AgentLib(agentsRepository, agentEventsRepository, token, policy);

      const action = await agentLib.addAction(getUser(), 'agent:1', {
        type: 'PAUSE',
      });

      expect(action.id).toBeDefined();
      expect(action.created_at).toBeDefined();
      expect(action.type).toBe('PAUSE');
      expect(spy).toHaveBeenCalled();

      spy.mockRestore();
    });
  });
});
