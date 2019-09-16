/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentLib } from './agent';
import { TokenLib } from './token';
import { PolicyLib } from './policy';
import { InMemoryAgentAdapter } from './adapters/agent/in_memory';
import { Agent } from './adapters/agent/adapter_type';
import { TokenAdapter } from './adapters/tokens/default';
import { FrameworkLib } from './framework';
import { PolicyAdapter } from './adapters/policy/default';
import { FrameworkRequest } from './adapters/framework/adapter_types';

jest.mock('./token');
jest.mock('./policy');

describe('Agent lib', () => {
  function getRequest() {
    return ({} as unknown) as FrameworkRequest;
  }
  describe('Enroll', () => {
    it('Should throw if the enrollment token is not valid', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentAdapter = new InMemoryAgentAdapter();
      const agentLib = new AgentLib(agentAdapter, token, policy);

      let error: Error | null = null;
      try {
        await agentLib.enroll(
          getRequest(),
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
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentLib = new AgentLib(agentAdapter, token, policy);

      const agent = await agentLib.enroll(
        getRequest(),
        'valid-enrollment-token',
        'PERMANENT',
        undefined,
        'agent-1'
      );

      expect(agent).toBeDefined();
      expect(agent).toMatchObject({
        access_token: 'mock-access-token-1',
        policy_id: 'policyId',
        policy_shared_id: 'configSharedId',
      });
    });

    it('Should allow to enroll a new PERMANENT agent again if this agent is active', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentLib = new AgentLib(agentAdapter, token, policy);

      const agent1 = await agentLib.enroll(
        getRequest(),
        'valid-enrollment-token',
        'PERMANENT',
        undefined,
        'agent-1'
      );

      // Desactivate this agent
      agentAdapter.agents[agent1.id].active = false;

      const agent2 = await agentLib.enroll(
        getRequest(),
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
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentLib = new AgentLib(agentAdapter, token, policy);

      await agentLib.enroll(
        getRequest(),
        'valid-enrollment-token',
        'PERMANENT',
        undefined,
        'agent-1'
      );
      let error: Error | null = null;

      try {
        await agentLib.enroll(
          getRequest(),
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
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentLib = new AgentLib(agentAdapter, token, policy);

      const agent = await agentLib.enroll(
        getRequest(),
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
        undefined
      );

      expect(agent).toBeDefined();
      expect(agent).toMatchObject({
        access_token: 'mock-access-token-1',
        policy_id: 'policyId',
        policy_shared_id: 'configSharedId',
      });
    });

    it('When enrolling a new EPHEMERAL_INSTANCE agent it should create a EPHEMERAL agent too', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentLib = new AgentLib(agentAdapter, token, policy);

      const agent = await agentLib.enroll(
        getRequest(),
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
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
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentLib = new AgentLib(agentAdapter, token, policy);

      const agent1 = await agentLib.enroll(
        getRequest(),
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
        undefined
      );
      const agent2 = await agentLib.enroll(
        getRequest(),
        'valid-enrollment-token',
        'EPHEMERAL_INSTANCE',
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
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentLib = new AgentLib(agentAdapter, token, policy);

      await agentLib.delete(getRequest(), {
        id: 'agent:1',
        type: 'EPHEMERAL_INSTANCE',
      } as Agent);

      expect(agentAdapter.delete).toHaveBeenCalled();
    });

    it('should desactivate other agent', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      agentAdapter.update = jest.fn(async () => {});
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentLib = new AgentLib(agentAdapter, token, policy);

      await agentLib.delete(getRequest(), {
        id: 'agent:1',
        type: 'PERMANENT',
      } as Agent);

      expect(agentAdapter.update).toHaveBeenCalledWith({}, 'agent:1', {
        active: false,
      });
    });
  });

  describe('list', () => {
    it('should return all agents', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentAdapter = new InMemoryAgentAdapter();
      agentAdapter.agents['agent:1'] = { id: 'agent:1' } as Agent;
      agentAdapter.agents['agent:2'] = { id: 'agent:2' } as Agent;

      const agentLib = new AgentLib(agentAdapter, token, policy);

      const res = await agentLib.list(getRequest());

      expect(res).toBeDefined();
      expect(res.total).toBe(2);
      expect(res.agents).toHaveLength(2);
    });
  });

  describe('checkin', () => {
    it('should throw if the agens do not exists', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentLib = new AgentLib(agentAdapter, token, policy);

      await expect(
        agentLib.checkin(getRequest(), 'agent:1', [
          {
            timestamp: '2019-09-05T15:41:26+0000',
            type: 'STATE',
            event: {
              message: 'State changed from PAUSE to STARTING',
              type: 'STARTING',
            },
          },
        ])
      ).rejects.toThrowError(/Agent not found/);
    });

    it('should update events', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentAdapter = new InMemoryAgentAdapter();
      agentAdapter.agents['agent:1'] = ({
        id: 'agent:1',
        actions: [],
        active: true,
        policy_id: 'policy:1',
        events: [
          {
            timestamp: '2019-09-05T15:43:26+0000',
            type: 'STATE',
            event: {
              message: 'State changed from RUNNING to STOPPED',
              type: 'STOPPED',
            },
          },
        ],
      } as unknown) as Agent;
      const agentLib = new AgentLib(agentAdapter, token, policy);

      await agentLib.checkin(getRequest(), 'agent:1', [
        {
          timestamp: '2019-09-05T15:41:26+0000',
          type: 'STATE',
          event: {
            message: 'State changed from PAUSE to STARTING',
            type: 'STARTING',
          },
        },
      ]);

      const refreshAgent = (await agentAdapter.getById(getRequest(), 'agent:1')) as Agent;
      expect(refreshAgent.events).toHaveLength(2);
      expect(refreshAgent.events[0]).toMatchObject({
        type: 'STATE',
        event: {
          type: 'STARTING',
        },
      });

      expect(refreshAgent.events[1]).toMatchObject({
        type: 'STATE',
        event: {
          type: 'STOPPED',
        },
      });
    });

    it('should not update agent metadata if none are provided', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentAdapter = new InMemoryAgentAdapter();
      agentAdapter.agents['agent:1'] = ({
        id: 'agent:1',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
      } as unknown) as Agent;
      const agentLib = new AgentLib(agentAdapter, token, policy);

      await agentLib.checkin(getRequest(), 'agent:1', []);

      const refreshAgent = (await agentAdapter.getById(getRequest(), 'agent:1')) as Agent;
      expect(refreshAgent.local_metadata).toMatchObject({
        key: 'local1',
      });
    });

    it('should return the full policy for this agent', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const policyLib = new PolicyLib({} as PolicyAdapter);
      const agentAdapter = new InMemoryAgentAdapter();
      agentAdapter.agents['agent:1'] = ({
        id: 'agent:1',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
      } as unknown) as Agent;
      const agentLib = new AgentLib(agentAdapter, token, policyLib);

      const { policy } = await agentLib.checkin(getRequest(), 'agent:1', []);

      expect(policy).toMatchObject({
        id: 'policy:1',
      });
    });

    it('should update agent metadata if provided', async () => {
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      agentAdapter.agents['agent:1'] = ({
        id: 'agent:1',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
      } as unknown) as Agent;
      const policy = new PolicyLib({} as PolicyAdapter);
      const agentLib = new AgentLib(agentAdapter, token, policy);

      await agentLib.checkin(getRequest(), 'agent:1', [], { key: 'local2' });

      const refreshAgent = (await agentAdapter.getById(getRequest(), 'agent:1')) as Agent;
      expect(refreshAgent.local_metadata).toMatchObject({
        key: 'local2',
      });
    });

    it('should return new actions', async () => {
      const policy = new PolicyLib({} as PolicyAdapter);
      const token = new TokenLib({} as TokenAdapter, {} as FrameworkLib);
      const agentAdapter = new InMemoryAgentAdapter();
      agentAdapter.agents['agent:1'] = ({
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

      const agentLib = new AgentLib(agentAdapter, token, policy);
      const { actions } = await agentLib.checkin(getRequest(), 'agent:1', []);

      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        type: 'PAUSE',
        id: 'this-a-unique-id',
      });

      const refreshAgent = (await agentAdapter.getById(getRequest(), 'agent:1')) as Agent;
      expect(refreshAgent.actions[0].sent_at).toBeDefined();
    });
  });
});
