/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { SavedObject } from 'kibana/server';
import { FrameworkUser, internalAuthData } from '../adapters/framework/adapter_types';
import { SODatabaseAdapter } from '../adapters/saved_objects_database/default';
import { MemorizeSODatabaseAdapter } from '../adapters/saved_objects_database/memorize_adapter';
import { Agent } from '../repositories/agents/types';
import { compose } from './compose/memorized';
import { FleetServerLib } from './types';
import { AGENT_POLLING_THRESHOLD_MS } from '../../common/constants';

jest.mock('./api_keys');
jest.mock('./policy');

function getUser(apiKey?: string, apiKeyId?: string) {
  if (!apiKey) {
    return { kind: 'internal' } as FrameworkUser;
  }
  return ({
    kind: 'authenticated',
    [internalAuthData]: {
      headers: {
        authorization: `ApiKey ${Buffer.from(`${apiKeyId || 'key_id'}:${apiKey}`).toString(
          'base64'
        )}`,
      },
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

  describe('acknowledgeActions', () => {
    it('should acknowledge actions', async () => {
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
              id: 'action-1',
              sent_at: '2019-09-05T15:42:26+0000',
            },
            {
              created_at: '2019-09-05T15:43:26+0000',
              type: 'PAUSE',
              id: 'action-2',
            },
            {
              created_at: '2019-09-05T15:41:26+0000',
              type: 'PAUSE',
              id: 'action-3',
            },
          ],
        },
      ]);

      const agent = await agents.getActiveByApiKeyId(getUser(), 'key1');
      await agents.acknowledgeActions(getUser(), agent, ['action-2']);

      const refreshAgent = await agents.getActiveByApiKeyId(getUser(), 'key1');

      expect(refreshAgent.actions).toHaveLength(3);
      expect(refreshAgent.actions.find(({ id }) => id === 'action-1')).toHaveProperty('sent_at');
      expect(refreshAgent.actions.find(({ id }) => id === 'action-2')).toHaveProperty('sent_at');
      expect(refreshAgent.actions.find(({ id }) => id === 'action-3')).not.toHaveProperty(
        'sent_at'
      );
    });
  });

  describe('checkin', () => {
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

      const agent = await agents.getActiveByApiKeyId(getUser(), 'key1');
      await agents.checkin(getUser(), agent, [
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

      const agent = await agents.getActiveByApiKeyId(getUser(), 'key1');
      await agents.checkin(getUser(), agent, []);

      const refreshAgent = await getAgentById(agentId);
      expect(
        JSON.parse((refreshAgent as SavedObject).attributes.local_metadata as string)
      ).toMatchObject({
        key: 'local1',
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

      const agent = await agents.getActiveByApiKeyId(getUser(), 'key1');
      await agents.checkin(getUser('VALID_KEY', 'key1'), agent, [], { key: 'local2' });

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

      const agent = await agents.getActiveByApiKeyId(getUser(), 'key1');
      const { actions } = await agents.checkin(getUser('VALID_KEY', 'key1'), agent, []);

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

  describe('getAgentsStatusForPolicy', () => {
    it('should return all agents', async () => {
      const { agents } = libs;
      const policyId = 'policy1';
      await loadFixtures([
        // Other policies
        {
          type: 'PERMANENT',
          active: true,
          policy_id: 'policy2',
        },
        {
          type: 'PERMANENT',
          active: true,
          policy_id: 'policy3',
        },
        {
          type: 'TEMPORARY',
          active: true,
          policy_id: 'policy3',
        },
        // PERMANENT
        // ERROR
        {
          type: 'PERMANENT',
          active: true,
          policy_id: policyId,
          last_checkin: new Date(Date.now() - AGENT_POLLING_THRESHOLD_MS * 10).toISOString(),
        },
        // ACTIVE
        {
          type: 'PERMANENT',
          active: true,
          policy_id: policyId,
          last_checkin: new Date().toISOString(),
        },
        {
          type: 'PERMANENT',
          active: true,
          policy_id: policyId,
          last_checkin: new Date().toISOString(),
        },
        // TEMPORARY
        // OFFLINE
        {
          type: 'TEMPORARY',
          active: true,
          policy_id: policyId,
          last_checkin: new Date(Date.now() - AGENT_POLLING_THRESHOLD_MS * 10).toISOString(),
        },
        // Active
        {
          type: 'TEMPORARY',
          active: true,
          policy_id: policyId,
          last_checkin: new Date().toISOString(),
        },
      ]);

      const res = await agents.getAgentsStatusForPolicy(getUser(), policyId);
      expect(res).toMatchObject({
        total: 5,
        online: 3,
        error: 1,
        offline: 1,
      });
    });
  });
});
