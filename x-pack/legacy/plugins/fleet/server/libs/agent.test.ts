/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { AgentLib } from './agent';
import { ApiKeyLib } from './api_keys';
import { PolicyLib } from './policy';
import { InMemoryAgentsRepository } from '../repositories/agents/in_memory';
import { Agent } from '../repositories/agents/types';
import { PoliciesRepository } from '../repositories/policies/default';
import { FrameworkUser, internalAuthData } from '../adapters/framework/adapter_types';
import { InMemoryAgentEventsRepository } from '../repositories/agent_events/in_memory';

jest.mock('./api_keys');
jest.mock('./policy');

function getMockedApiKeyLib() {
  // @ts-ignore
  return new ApiKeyLib();
}

function compose() {
  const apiKeyLib = getMockedApiKeyLib();
  const policy = new PolicyLib({} as PoliciesRepository);
  const agentsRepository = new InMemoryAgentsRepository();
  const agentsEventsRepository = new InMemoryAgentEventsRepository();
  const agentLib = new AgentLib(agentsRepository, agentsEventsRepository, apiKeyLib, policy);

  return {
    agentLib,
    agentsRepository,
    agentsEventsRepository,
  };
}

function getUser(apiKey?: string, apiKeyId?: string) {
  if (!apiKey) {
    return {} as FrameworkUser;
  }
  return ({
    kind: 'authenticated',
    [internalAuthData]: {
      authorization: `ApiKey ${Buffer.from(`${apiKeyId || 'key_id'}:${apiKey}`).toString(
        'base64'
      )}`,
    },
  } as unknown) as FrameworkUser;
}

describe('Agent lib', () => {
  describe('Enroll', () => {
    it('Should throw if the enrollment api key is not valid', async () => {
      const { agentLib } = compose();
      let error: Error | null = null;
      try {
        await agentLib.enroll(getUser('INVALID_KEY'), 'PERMANENT', undefined, 'agent-1');
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect((error as Error).message).toBe('Enrollment apiKey is not valid: Not a valid api key');
    });

    it('Should enroll a new PERMANENT agent', async () => {
      const { agentLib } = compose();

      const agent = await agentLib.enroll(
        getUser('VALID_KEY_WITH_POLICY'),
        'PERMANENT',
        undefined,
        'agent-1'
      );

      expect(agent).toBeDefined();
      expect(agent).toMatchObject({
        access_api_key: 'mock-access-api-key-1',
        policy_id: 'policyId',
      });
    });

    it('Should allow to enroll a new PERMANENT agent again if this agent is active', async () => {
      const { agentLib, agentsRepository } = compose();

      const agent1 = await agentLib.enroll(getUser('VALID_KEY'), 'PERMANENT', undefined, 'agent-1');

      // Desactivate this agent
      agentsRepository.agents[agent1.id].active = false;

      const agent2 = await agentLib.enroll(getUser('VALID_KEY'), 'PERMANENT', undefined, 'agent-1');

      expect(agent2).toBeDefined();
      expect(agent2).toMatchObject({
        access_api_key: 'mock-access-api-key-2',
      });
    });

    it('Should not enroll a new PERMANENT agent if this agent is already active', async () => {
      const { agentLib } = compose();

      await agentLib.enroll(getUser('VALID_KEY'), 'PERMANENT', undefined, 'agent-1');
      let error: Error | null = null;

      try {
        await agentLib.enroll(getUser('VALID_KEY'), 'PERMANENT', undefined, 'agent-1');
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect((error as Error).message).toBe('Impossible to enroll an already active agent');
    });

    it('Should enroll a new EPHEMERAL agent', async () => {
      const { agentLib } = compose();

      const agent = await agentLib.enroll(getUser('VALID_KEY_WITH_POLICY'), 'EPHEMERAL', undefined);

      expect(agent).toBeDefined();
      expect(agent).toMatchObject({
        access_api_key: 'mock-access-api-key-1',
        policy_id: 'policyId',
      });
    });
  });

  describe('Delete', () => {
    it('should delete ephemeral instances', async () => {
      const { agentLib, agentsRepository } = compose();
      agentsRepository.delete = jest.fn(async () => {});

      await agentLib.delete(getUser(), {
        id: 'agent:1',
        type: 'EPHEMERAL',
      } as Agent);

      expect(agentsRepository.delete).toHaveBeenCalled();
    });

    it('should desactivate other agent', async () => {
      const { agentLib, agentsRepository } = compose();
      agentsRepository.update = jest.fn(async () => {});

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
      const { agentLib, agentsRepository } = compose();
      agentsRepository.agents['agent:1'] = { id: 'agent:1' } as Agent;
      agentsRepository.agents['agent:2'] = { id: 'agent:2' } as Agent;

      const res = await agentLib.list(getUser());

      expect(res).toBeDefined();
      expect(res.total).toBe(2);
      expect(res.agents).toHaveLength(2);
    });
  });

  describe('checkin', () => {
    it('should throw if the agens do not exists', async () => {
      const { agentLib } = compose();

      await expect(
        agentLib.checkin(getUser('VALID_KEY'), [
          {
            timestamp: '2019-09-05T15:41:26+0000',
            type: 'STATE',
            subtype: 'STARTING',
            message: 'State changed from PAUSE to STARTING',
          },
        ])
      ).rejects.toThrowError(/Agent not found/);
    });

    it('should throw is the agent is not active', async () => {
      const { agentLib, agentsRepository } = compose();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        actions: [],
        active: false,
        policy_id: 'policy:1',
        access_api_key_id: 'key1',
      } as unknown) as Agent;

      await expect(agentLib.checkin(getUser('VALID_KEY', 'key1'), [])).rejects.toThrowError(
        /Agent inactive/
      );
    });

    it('should persist new events', async () => {
      const { agentLib, agentsRepository, agentsEventsRepository } = compose();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        actions: [],
        active: true,
        policy_id: 'policy:1',
        access_api_key_id: 'key1',
      } as unknown) as Agent;

      await agentLib.checkin(getUser('VALID_KEY', 'key1'), [
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
      const { agentLib, agentsRepository } = compose();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
        access_api_key_id: 'key1',
      } as unknown) as Agent;

      await agentLib.checkin(getUser('VALID_KEY', 'key1'), []);

      const refreshAgent = (await agentsRepository.getById(getUser(), 'agent:1')) as Agent;
      expect(refreshAgent.local_metadata).toMatchObject({
        key: 'local1',
      });
    });

    it('should return the full policy for this agent', async () => {
      const { agentLib, agentsRepository } = compose();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
        access_api_key_id: 'key1',
      } as unknown) as Agent;

      const { policy } = await agentLib.checkin(getUser('VALID_KEY', 'key1'), []);

      expect(policy).toMatchObject({
        id: 'policy:1',
      });
    });

    it('should update agent metadata if provided', async () => {
      const { agentLib, agentsRepository } = compose();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
        access_api_key_id: 'key1',
      } as unknown) as Agent;

      await agentLib.checkin(getUser('VALID_KEY', 'key1'), [], { key: 'local2' });

      const refreshAgent = (await agentsRepository.getById(getUser(), 'agent:1')) as Agent;
      expect(refreshAgent.local_metadata).toMatchObject({
        key: 'local2',
      });
    });

    it('should return new actions', async () => {
      const { agentLib, agentsRepository } = compose();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        active: true,
        policy_id: 'policy:1',
        access_api_key_id: 'key1',
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
      const { actions } = await agentLib.checkin(getUser('VALID_KEY', 'key1'), []);

      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        type: 'PAUSE',
        id: 'this-a-unique-id',
      });

      const refreshAgent = (await agentsRepository.getById(getUser(), 'agent:1')) as Agent;
      expect(refreshAgent.actions[0].sent_at).toBeDefined();
    });
  });

  describe('unenroll', () => {
    it('should set the list of agents as inactive', async () => {
      const { agentLib, agentsRepository } = compose();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
      } as unknown) as Agent;
      agentsRepository.agents['agent:2'] = ({
        id: 'agent:2',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
      } as unknown) as Agent;

      await agentLib.unenroll(getUser(), ['agent:1', 'agent:2']);

      const refreshAgent1 = (await agentsRepository.getById(getUser(), 'agent:1')) as Agent;
      const refreshAgent2 = (await agentsRepository.getById(getUser(), 'agent:2')) as Agent;

      expect(refreshAgent1.active).toBeFalsy();
      expect(refreshAgent2.active).toBeFalsy();
    });
  });

  describe('unenrollForPolicy', () => {
    it('should set all the of agents for this policy as inactive', async () => {
      const { agentLib, agentsRepository } = compose();
      agentsRepository.agents['agent:1'] = ({
        id: 'agent:1',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
      } as unknown) as Agent;
      agentsRepository.agents['agent:2'] = ({
        id: 'agent:2',
        local_metadata: { key: 'local1' },
        user_provided_metadata: { key: 'user1' },
        actions: [],
        events: [],
        active: true,
        policy_id: 'policy:1',
      } as unknown) as Agent;

      await agentLib.unenrollForPolicy(getUser(), 'policy:1');

      const refreshAgent1 = (await agentsRepository.getById(getUser(), 'agent:1')) as Agent;
      const refreshAgent2 = (await agentsRepository.getById(getUser(), 'agent:2')) as Agent;

      expect(refreshAgent1.active).toBeFalsy();
      expect(refreshAgent2.active).toBeFalsy();
    });
  });

  describe('addAction', () => {
    it('should throw if the agent do not exists', async () => {
      const { agentLib } = compose();

      await expect(
        agentLib.addAction(getUser(), 'agent:1', {
          type: 'PAUSE',
        })
      ).rejects.toThrowError(/Agent not found/);
    });

    it('should add the action', async () => {
      const { agentLib, agentsRepository } = compose();
      agentsRepository.agents['agent:1'] = {
        id: 'agent:1',
        actions: [],
        active: true,
        type: 'PERMANENT',
        policy_id: 'config1',
      };
      const spy = jest.spyOn(agentsRepository, 'update');

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
