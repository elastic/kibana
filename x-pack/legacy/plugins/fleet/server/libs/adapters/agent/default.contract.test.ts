/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import moment from 'moment';
import { SavedObject } from 'src/core/server';
import { AgentAdapter } from './default';
import { SODatabaseAdapter as SODatabaseAdapterType } from '../saved_objets_database/adapter_types';
import { SODatabaseAdapter } from '../saved_objets_database/default';
import { MemorizeSODatabaseAdapter } from '../saved_objets_database/memorize_adapter';
import { createKibanaServer } from '../../../../../../../test_utils/jest/contract_tests/servers';
import { Agent, SortOptions } from './adapter_type';
import { FrameworkUser, internalAuthData } from '../framework/adapter_types';

describe('Agent Adapter', () => {
  let adapter: AgentAdapter;
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
    adapter = new AgentAdapter(soAdapter);
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
        access_token: 'TOKEN_1',
        policy_id: 'policy_id_1',
        policy_shared_id: 'shared_policy_id-1',
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
        access_token: 'TOKEN_1',
        policy_id: 'policy_id_1',
        policy_shared_id: 'shared_policy_id-1',
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
          access_token: 'TOKEN_1',
          policy_id: 'policy_id_1',
          policy_shared_id: 'shared_policy_id-1',
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
          access_token: 'TOKEN_1',
          policy_id: 'policy_id_1',
          policy_shared_id: 'shared_policy_id-1',
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
          access_token: 'TOKEN_1',
          policy_id: 'policy_id_1',
          policy_shared_id: 'shared_policy_id-1',
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
          access_token: 'TOKEN_1',
          policy_id: 'policy_id_1',
          policy_shared_id: 'shared_policy_id-1',
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
          access_token: 'TOKEN_1',
          policy_id: 'policy_id_1',
          policy_shared_id: 'shared_policy_id-1',
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
  describe('findEphemeralByPolicySharedId', () => {
    beforeAll(async () => {
      await loadFixtures([
        {
          shared_id: 'agent1',
          active: false,
          access_token: 'TOKEN_1',
          policy_id: 'policy_id_1',
          policy_shared_id: 'shared_policy_id_1',
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
          access_token: 'TOKEN_1',
          policy_id: 'policy_id_1',
          policy_shared_id: 'shared_policy_id-1',
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

    it('should allow to find agent by policy shared id', async () => {
      const agent = await adapter.findEphemeralByPolicySharedId(getUser(), 'shared_policy_id_1');
      expect(agent).toBeDefined();
      expect((agent as Agent).shared_id).toBe('agent1');
    });
  });

  describe('list', () => {
    beforeEach(async () => {
      const agents = Array(20)
        .fill(null)
        .map((_, idx) => {
          return {
            shared_id: `agent${idx}`,
            active: false,
            access_token: 'TOKEN_1',
            policy_id: 'policy_id_1',
            policy_shared_id: 'shared_policy_id_1',
            type: 'EPHEMERAL',
            version: '1',
            local_metadata: {
              host: 'test.fr',
            },
            user_provided_metadata: {
              color: 'red',
            },
            enrolled_at: moment('2019-08-05T19:35:14.861Z')
              .add(idx, 'day')
              .toISOString(),
          };
        });
      await loadFixtures(agents);
    });

    it('should list all agents', async () => {
      const res = await adapter.list(getUser());
      expect(res.total).toBe(20);
    });

    it('should support to sort by enrolled_at date ASC', async () => {
      const res = await adapter.list(getUser(), SortOptions.EnrolledAtASC, 1, 3);

      expect(res.agents.map(a => a.shared_id)).toEqual(['agent0', 'agent1', 'agent2']);
    });

    it('should support to sort by enrolled_at date DESC', async () => {
      const res = await adapter.list(getUser(), SortOptions.EnrolledAtDESC, 1, 3);

      expect(res.agents.map(a => a.shared_id)).toEqual(['agent19', 'agent18', 'agent17']);
    });
  });

  describe('findByMetadata', () => {
    beforeEach(async () => {
      await loadFixtures([
        {
          shared_id: 'agent1',
          active: false,
          access_token: 'TOKEN_1',
          policy_id: 'policy_id_1',
          policy_shared_id: 'shared_policy_id_1',
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
          access_token: 'TOKEN_1',
          policy_id: 'policy_id_1',
          policy_shared_id: 'shared_policy_id-1',
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
