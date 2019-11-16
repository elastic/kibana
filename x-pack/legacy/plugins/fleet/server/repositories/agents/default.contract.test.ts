/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import moment from 'moment';
import { SavedObject } from 'src/core/server';
import { AgentsRepository } from './default';
import { SODatabaseAdapter as SODatabaseAdapterType } from '../../adapters/saved_objects_database/adapter_types';
import { SODatabaseAdapter } from '../../adapters/saved_objects_database/default';
import { MemorizeSODatabaseAdapter } from '../../adapters/saved_objects_database/memorize_adapter';
import { Agent, SortOptions } from './types';
import { FrameworkUser, internalAuthData } from '../../adapters/framework/adapter_types';

describe('AgentsRepository', () => {
  let adapter: AgentsRepository;
  let soAdapter: SODatabaseAdapterType;
  let servers: any;

  function getUser(): FrameworkUser {
    return ({
      kind: 'authenticated',
      [internalAuthData]: {
        authorization: `Basic ${Buffer.from(`elastic:changeme`).toString('base64')}`,
      },
    } as unknown) as FrameworkUser;
  }

  async function loadFixtures(agents: any[]): Promise<SavedObject[]> {
    const res: SavedObject[] = [];
    for (const agent of agents) {
      res.push(
        await soAdapter.create(getUser(), 'agents', {
          ...agent,
          local_metadata: JSON.stringify(agent.local_metadata || {}),
          user_provided_metadata: JSON.stringify(agent.user_provided_metadata || {}),
        })
      );
    }

    return res;
  }

  async function clearFixtures() {
    const request = getUser();
    const { saved_objects: savedObjects } = await soAdapter.find(request, {
      type: 'agents',
      perPage: 1000,
    });
    for (const so of savedObjects) {
      await soAdapter.delete(request, 'agents', so.id);
    }
  }

  beforeAll(async () => {
    await Slapshot.callWhenOnline(async () => {
      const { createKibanaServer } = await import(
        '../../../../../../test_utils/jest/contract_tests/servers'
      );
      servers = await createKibanaServer({
        security: { enabled: false },
      });
      const baseAdapter = new SODatabaseAdapter(
        servers.kbnServer.savedObjects,
        servers.kbnServer.plugins.elasticsearch
      );
      soAdapter = new MemorizeSODatabaseAdapter(baseAdapter);
    });

    if (!soAdapter) {
      soAdapter = new MemorizeSODatabaseAdapter();
    }
    adapter = new AgentsRepository(soAdapter);
  });

  afterAll(async () => {
    if (servers) {
      await servers.shutdown;
    }
  });

  afterEach(clearFixtures);

  describe('create', () => {
    it('should create a new agent', async () => {
      const agent = await adapter.create(getUser(), {
        shared_id: 'agent1',
        active: false,
        access_api_key_id: 'api_key_1',
        policy_id: 'policy_id_1',
        type: 'EPHEMERAL',
        version: '1',
        local_metadata: {
          host: 'localhost',
        },
        user_provided_metadata: undefined,
        enrolled_at: '2019-08-05T19:35:14.861Z',
      });

      expect(agent).toBeDefined();
      expect(agent.id).toBeDefined();
      expect(agent).toMatchObject({
        shared_id: 'agent1',
        active: false,
        access_api_key_id: 'api_key_1',
        policy_id: 'policy_id_1',
        type: 'EPHEMERAL',
        version: '1',
        local_metadata: {
          host: 'localhost',
        },
      });
    });

    it('should create a new agent with the specified id if specified', async () => {
      const agent = await adapter.create(
        getUser(),
        {
          shared_id: 'agent1',
          active: false,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy_id_1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'localhost',
          },
          user_provided_metadata: undefined,
          enrolled_at: '2019-08-05T19:35:14.861Z',
        },
        {
          id: 'test-agent-id-1',
        }
      );

      expect(agent).toBeDefined();
      expect(agent.id).toBe('test-agent-id-1');
    });

    it('should allow to create a new agent with the same id two time if override is true', async () => {
      const agent1 = await adapter.create(
        getUser(),
        {
          shared_id: 'agent1',
          active: false,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy_id_1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'localhost',
          },
          user_provided_metadata: undefined,
          enrolled_at: '2019-08-05T19:35:14.861Z',
        },
        {
          id: 'test-agent-id-2',
        }
      );
      const agent2 = await adapter.create(
        getUser(),
        {
          shared_id: 'agent1',
          active: false,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy_id_1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'localhost',
          },
          user_provided_metadata: undefined,
          enrolled_at: '2019-08-05T19:35:14.861Z',
        },
        {
          id: 'test-agent-id-2',
          overwrite: true,
        }
      );

      expect(agent1.id).toBe(agent2.id);
    });
  });

  describe('update', () => {
    let agentId: string;
    beforeAll(async () => {
      const agents = await loadFixtures([
        {
          shared_id: 'agent1',
          active: false,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy_id_1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'localhost',
          },
          user_provided_metadata: undefined,
          enrolled_at: '2019-08-05T19:35:14.861Z',
        },
      ]);

      agentId = agents[0].id;
    });
    it('should allow to update an agent', async () => {
      await adapter.update(getUser(), agentId, {
        active: true,
      });

      const freshAgent = await adapter.getById(getUser(), agentId);
      expect(freshAgent).toBeDefined();
      expect(freshAgent).toMatchObject({
        shared_id: 'agent1',
        active: true,
      });
    });
  });

  describe('delete', () => {
    let agentId: string;
    beforeAll(async () => {
      const agents = await loadFixtures([
        {
          shared_id: 'agent1',
          active: false,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy_id_1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'localhost',
          },
          user_provided_metadata: undefined,
          enrolled_at: '2019-08-05T19:35:14.861Z',
        },
      ]);
      agentId = agents[0].id;
    });

    it('should delete an agent', async () => {
      await adapter.delete(getUser(), { id: agentId } as Agent);

      const freshAgent = await adapter.getById(getUser(), agentId);

      expect(freshAgent).toBeNull();
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      const permanentAgents = Array(20)
        .fill(null)
        .map((_, idx) => {
          return {
            shared_id: `agent${idx}`,
            active: true,
            access_api_key_id: 'api_key_1',
            policy_id: 'policy_id_1',
            type: 'PERMANENT',
            version: '1',
            local_metadata: {
              host: 'test.fr',
            },
            user_provided_metadata: {
              color: 'red',
            },
            enrolled_at: moment('2019-08-05T19:35:14.861Z')
              .add(idx + 2, 'day')
              .toISOString(),
          };
        });
      const ephemeralAgents = [
        {
          shared_id: `ephemeral1`,
          active: true,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy_id_1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'test.fr',
          },
          user_provided_metadata: {
            color: 'red',
          },
          last_checkin: moment().toISOString(),
          enrolled_at: moment('2019-08-05T19:35:14.861Z').toISOString(),
        },
      ];

      const inactiveAgents = [
        // Inactive besace active:false
        {
          shared_id: `inactive_agent_1`,
          active: false,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy_id_1',
          type: 'PERMANENT',
          version: '1',
          local_metadata: {
            host: 'test.fr',
          },
          user_provided_metadata: {
            color: 'red',
          },
          enrolled_at: moment('2019-08-05T19:35:14.861Z')
            .add(100, 'day')
            .toISOString(),
        },
        // Inactive because ephemeral and last_checkin is after 3 polling times
        {
          shared_id: `inactive_agent_2`,
          active: true,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy_id_1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'test.fr',
          },
          user_provided_metadata: {
            color: 'red',
          },
          last_checkin: moment()
            .subtract(2, 'day')
            .toISOString(),
          enrolled_at: moment('2019-08-05T19:35:14.861Z').toISOString(),
        },
      ];

      await loadFixtures(permanentAgents.concat(inactiveAgents, ephemeralAgents));
    });

    it('should list all active agents', async () => {
      const res = await adapter.list(getUser(), { page: 1, perPage: 100 });
      const agentIds = res.agents.map(a => a.shared_id as string);
      expect(res.total).toBe(21);

      expect(agentIds).not.toContain('inactive_agent_1');
      expect(agentIds).not.toContain('inactive_agent_2');
    });

    it('should list all agents with showInactive set to true', async () => {
      const res = await adapter.list(getUser(), { page: 1, perPage: 100, showInactive: true });
      const agentIds = res.agents.map(a => a.shared_id as string);
      expect(res.total).toBe(23);

      expect(agentIds).toContain('inactive_agent_1');
      expect(agentIds).toContain('inactive_agent_2');
    });

    it('should support to sort by enrolled_at date ASC', async () => {
      const res = await adapter.list(getUser(), {
        sortOptions: SortOptions.EnrolledAtASC,
        page: 1,
        perPage: 3,
      });

      expect(res.agents.map(a => a.shared_id)).toEqual(['ephemeral1', 'agent0', 'agent1']);
    });

    it('should support to sort by enrolled_at date DESC', async () => {
      const res = await adapter.list(getUser(), {
        sortOptions: SortOptions.EnrolledAtDESC,
        page: 1,
        perPage: 3,
      });

      expect(res.agents.map(a => a.shared_id)).toEqual(['agent19', 'agent18', 'agent17']);
    });
  });

  describe('list for policy', () => {
    beforeEach(async () => {
      await loadFixtures([
        // Policy 1
        {
          shared_id: `agent1`,
          active: true,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy-id-1',
          type: 'PERMANENT',
          version: '1',
          local_metadata: {},
          user_provided_metadata: {},
          enrolled_at: '2019-08-05T19:35:14.861Z',
        },
        {
          shared_id: `agent2`,
          active: true,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy-id-1',
          type: 'PERMANENT',
          version: '1',
          local_metadata: {},
          user_provided_metadata: {},
          enrolled_at: '2019-08-05T19:35:14.861Z',
        },
        // Policy 2
        {
          shared_id: `agent3`,
          active: true,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy-id-2',
          type: 'PERMANENT',
          version: '1',
          local_metadata: {},
          user_provided_metadata: {},
          enrolled_at: '2019-08-05T19:35:14.861Z',
        },
      ]);
    });

    it('should allow to list agents for a policy', async () => {
      const { total, agents } = await adapter.listForPolicy(getUser(), 'policy-id-1');
      const agentSharedIds = agents.map(a => a.shared_id);

      expect(total).toBe(2);
      expect(agentSharedIds).toContain('agent1');
      expect(agentSharedIds).toContain('agent2');
    });
  });

  describe('findByMetadata', () => {
    beforeEach(async () => {
      await loadFixtures([
        {
          shared_id: 'agent1',
          active: false,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy_id_1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'test.fr',
          },
          user_provided_metadata: {
            color: 'red',
          },
          enrolled_at: '2019-08-05T19:35:14.861Z',
        },
        {
          shared_id: 'agent2',
          active: false,
          access_api_key_id: 'api_key_1',
          policy_id: 'policy_id_1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'elastic.co',
          },
          user_provided_metadata: {
            color: 'blue',
          },
          enrolled_at: '2019-08-05T19:35:14.861Z',
        },
      ]);
    });

    it('should allow to find agents by local metadata', async () => {
      const agentsFound = await adapter.findByMetadata(getUser(), {
        local: {
          host: 'elastic.co',
        },
      });

      expect(agentsFound).toHaveLength(1);
      expect(agentsFound[0].shared_id).toBe('agent2');
    });

    it('should allow to find agents by user provided metadata', async () => {
      const agentsFound = await adapter.findByMetadata(getUser(), {
        userProvided: {
          color: 'red',
        },
      });

      expect(agentsFound).toHaveLength(1);
      expect(agentsFound[0].shared_id).toBe('agent1');
    });
  });
});
