/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { Agent } from '../repositories/agents/types';
import { FrameworkUser, internalAuthData } from '../adapters/framework/adapter_types';
import { compose } from './compose/memorized';
import { FleetServerLib } from './types';
import { SODatabaseAdapter } from '../adapters/saved_objects_database/default';
import { MemorizeSODatabaseAdapter } from '../adapters/saved_objects_database/memorize_adapter';
import { SavedObject } from 'kibana/server';

jest.mock('./api_keys');
jest.mock('./policy');

function getUser(apiKey?: string, apiKeyId?: string) {
  if (!apiKey) {
    return { kind: 'internal' } as FrameworkUser;
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
  let servers: any;
  let libs: FleetServerLib;
  let soAdapter: MemorizeSODatabaseAdapter;

  async function clearFixtures() {
    const { saved_objects: savedObjects } = await soAdapter.find(getUser(), {
      type: 'agents',
      perPage: 1000,
    });
    for (const so of savedObjects) {
      await soAdapter.delete(getUser(), 'agents', so.id);
    }
  }

  async function loadFixtures(agents: Array<Partial<Agent>>) {
    const agentIds: string[] = [];
    for (const agent of agents) {
      agentIds.push(
        (
          await soAdapter.create(getUser(), 'agents', {
            ...agent,
            local_metadata: JSON.stringify(agent.local_metadata || {}),
            user_provided_metadata: JSON.stringify(agent.user_provided_metadata || {}),
          })
        ).id
      );
    }
    return agentIds;
  }

  async function getAgentById(agentId: string) {
    return await soAdapter.get(getUser(), 'agents', agentId);
  }
  beforeAll(async () => {
    await Slapshot.callWhenOnline(async () => {
      const { createKibanaServer } = await import(
        '../../../../../test_utils/jest/contract_tests/servers'
      );
      servers = await createKibanaServer({
        security: { enabled: false },
      });

      soAdapter = new MemorizeSODatabaseAdapter(
        new SODatabaseAdapter(
          servers.kbnServer.savedObjects,
          servers.kbnServer.plugins.elasticsearch
        )
      );
    });

    if (!soAdapter) {
      soAdapter = new MemorizeSODatabaseAdapter();
    }
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown;
    }
  });

  beforeEach(async () => {
    await clearFixtures();
    libs = compose(servers ? servers.kbnServer : undefined);
  });

  describe('Enroll', () => {
    it('Should throw if the enrollment api key is not valid', async () => {
      const { agents } = libs;
      let error: Error | null = null;
      try {
        await agents.enroll(getUser('INVALID_KEY'), 'PERMANENT', undefined, 'agent-1');
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect((error as Error).message).toBe('Enrollment apiKey is not valid: Not a valid api key');
    });

    it('Should enroll a new PERMANENT agent', async () => {
      const { agents } = libs;

      const agent = await agents.enroll(
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
      const { agents } = libs;

      const agent1 = await agents.enroll(getUser('VALID_KEY'), 'PERMANENT', undefined, 'agent-1');

      // Desactivate this agent
      await agents.delete(getUser(), agent1);

      const agent2 = await agents.enroll(getUser('VALID_KEY'), 'PERMANENT', undefined, 'agent-1');

      expect(agent2).toBeDefined();
      expect(agent2).toMatchObject({
        access_api_key: 'mock-access-api-key-2',
      });
    });

    it('Should not enroll a new PERMANENT agent if this agent is already active', async () => {
      const { agents } = libs;

      await agents.enroll(getUser('VALID_KEY'), 'PERMANENT', undefined, 'agent-1');
      let error: Error | null = null;

      try {
        await agents.enroll(getUser('VALID_KEY'), 'PERMANENT', undefined, 'agent-1');
      } catch (err) {
        error = err;
      }

      expect(error).toBeDefined();
      expect((error as Error).message).toBe('Impossible to enroll an already active agent');
    });

    it('Should enroll a new EPHEMERAL agent', async () => {
      const { agents } = libs;

      const agent = await agents.enroll(getUser('VALID_KEY_WITH_POLICY'), 'EPHEMERAL', undefined);

      expect(agent).toBeDefined();
      expect(agent).toMatchObject({
        access_api_key: 'mock-access-api-key-1',
        policy_id: 'policyId',
      });
    });
  });

  describe('Delete', () => {
    it('should delete ephemeral instances', async () => {
      const { agents } = libs;
      const [agentId] = await loadFixtures([
        {
          type: 'EPHEMERAL',
          active: true,
        },
      ]);

      await agents.delete(getUser(), {
        id: agentId,
        type: 'EPHEMERAL',
      } as Agent);

      const agent = await getAgentById(agentId);
      expect(agent).toBeNull();
    });

    it('should desactivate other agent', async () => {
      const { agents } = libs;
      const [agentId] = await loadFixtures([
        {
          type: 'PERMANENT',
          active: true,
        },
      ]);

      await agents.delete(getUser(), {
        id: agentId,
        type: 'PERMANENT',
      } as Agent);

      const agent = await getAgentById(agentId);
      expect(agent).toBeDefined();
      expect((agent as SavedObject<Agent>).attributes.active).toBeFalsy();
    });
  });

  describe('list', () => {
    it('should return all agents', async () => {
      const { agents } = libs;
      await loadFixtures([
        {
          type: 'PERMANENT',
          active: true,
        },
        {
          type: 'PERMANENT',
          active: true,
        },
      ]);

      const res = await agents.list(getUser());

      expect(res).toBeDefined();
      expect(res.total).toBe(2);
      expect(res.agents).toHaveLength(2);
    });
  });

  describe('checkin', () => {
    it('should throw if the agens do not exists', async () => {
      const { agents } = libs;

      await expect(
        agents.checkin(getUser('VALID_KEY'), [
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
      const { agents } = libs;
      await loadFixtures([
        {
          actions: [],
          active: false,
          policy_id: 'policy:1',
          access_api_key_id: 'key1',
        },
      ]);

      await expect(agents.checkin(getUser('VALID_KEY', 'key1'), [])).rejects.toThrowError(
        /Agent inactive/
      );
    });

    it('should persist new events', async () => {
      const { agents } = libs;
      const [agentId] = await loadFixtures([
        {
          actions: [],
          active: true,
          policy_id: 'policy:1',
          access_api_key_id: 'key1',
        },
      ]);

      await agents.checkin(getUser('VALID_KEY', 'key1'), [
        {
          timestamp: '2019-09-05T15:41:26+0000',
          type: 'STATE',
          subtype: 'STARTING',
          message: 'State changed from PAUSE to STARTING',
        },
      ]);

      const { saved_objects: events } = await soAdapter.find(getUser(), {
        type: 'agent_events',
        search: agentId,
        searchFields: ['agent_id'],
      });
      expect(events).toHaveLength(1);
      expect(events[0].attributes).toMatchObject({
        timestamp: '2019-09-05T15:41:26+0000',
        type: 'STATE',
        subtype: 'STARTING',
        message: 'State changed from PAUSE to STARTING',
      });
    });

    it('should not update agent metadata if none are provided', async () => {
      const { agents } = libs;
      const [agentId] = await loadFixtures([
        {
          local_metadata: { key: 'local1' },
          user_provided_metadata: { key: 'user1' },
          actions: [],
          active: true,
          policy_id: 'policy:1',
          access_api_key_id: 'key1',
        },
      ]);

      await agents.checkin(getUser('VALID_KEY', 'key1'), []);

      const refreshAgent = await getAgentById(agentId);
      expect(
        JSON.parse((refreshAgent as SavedObject).attributes.local_metadata as string)
      ).toMatchObject({
        key: 'local1',
      });
    });

    it('should return the full policy for this agent', async () => {
      const { agents } = libs;
      await loadFixtures([
        {
          local_metadata: { key: 'local1' },
          user_provided_metadata: { key: 'user1' },
          actions: [],
          active: true,
          policy_id: 'policy:1',
          access_api_key_id: 'key1',
        },
      ]);

      const { policy } = await agents.checkin(getUser('VALID_KEY', 'key1'), []);

      expect(policy).toMatchObject({
        id: 'policy:1',
      });
    });

    it('should update agent metadata if provided', async () => {
      const { agents } = libs;
      const [agentId] = await loadFixtures([
        {
          local_metadata: { key: 'local1' },
          user_provided_metadata: { key: 'user1' },
          actions: [],
          active: true,
          policy_id: 'policy:1',
          access_api_key_id: 'key1',
        },
      ]);

      await agents.checkin(getUser('VALID_KEY', 'key1'), [], { key: 'local2' });

      const refreshAgent = await getAgentById(agentId);
      expect(
        JSON.parse((refreshAgent as SavedObject).attributes.local_metadata as string)
      ).toMatchObject({
        key: 'local2',
      });
    });

    it('should return new actions', async () => {
      const { agents } = libs;
      await loadFixtures([
        {
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
        },
      ]);
      const { actions } = await agents.checkin(getUser('VALID_KEY', 'key1'), []);

      expect(actions).toHaveLength(1);
      expect(actions[0]).toMatchObject({
        type: 'PAUSE',
        id: 'this-a-unique-id',
      });
    });
  });

  describe('unenroll', () => {
    it('should set the list of agents as inactive', async () => {
      const { agents } = libs;
      const [agent1Id, agent2Id] = await loadFixtures([
        {
          local_metadata: { key: 'local1' },
          user_provided_metadata: { key: 'user1' },
          actions: [],
          active: true,
          policy_id: 'policy:1',
        },
        {
          local_metadata: { key: 'local1' },
          user_provided_metadata: { key: 'user1' },
          actions: [],
          active: true,
          policy_id: 'policy:1',
        },
      ]);

      await agents.unenroll(getUser(), [agent1Id, agent2Id]);

      const refreshAgent1 = (await getAgentById(agent1Id)) as SavedObject;
      const refreshAgent2 = (await getAgentById(agent2Id)) as SavedObject;

      expect(refreshAgent1.attributes.active).toBeFalsy();
      expect(refreshAgent2.attributes.active).toBeFalsy();
    });
  });

  describe('unenrollForPolicy', () => {
    it('should set all the of agents for this policy as inactive', async () => {
      const { agents } = libs;
      const [agent1Id, agent2Id] = await loadFixtures([
        {
          local_metadata: { key: 'local1' },
          user_provided_metadata: { key: 'user1' },
          actions: [],
          active: true,
          policy_id: 'policy:1',
        },
        {
          local_metadata: { key: 'local1' },
          user_provided_metadata: { key: 'user1' },
          actions: [],
          active: true,
          policy_id: 'policy:1',
        },
      ]);

      await agents.unenrollForPolicy(getUser(), 'policy:1');

      const refreshAgent1 = (await getAgentById(agent1Id)) as SavedObject;
      const refreshAgent2 = (await getAgentById(agent2Id)) as SavedObject;

      expect(refreshAgent1.attributes.active).toBeFalsy();
      expect(refreshAgent2.attributes.active).toBeFalsy();
    });
  });

  describe('addAction', () => {
    it('should throw if the agent do not exists', async () => {
      const { agents } = libs;

      await expect(
        agents.addAction(getUser(), 'agent:1', {
          type: 'PAUSE',
        })
      ).rejects.toThrowError(/Agent not found/);
    });
  });
});
