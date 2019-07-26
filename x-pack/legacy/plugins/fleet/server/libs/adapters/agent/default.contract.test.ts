/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { AgentAdapter } from './default';
import { SODatabaseAdapter as SODatabaseAdapterType } from '../saved_objets_database/adapter_types';
import { SODatabaseAdapter } from '../saved_objets_database/default';
import { MemorizeSODatabaseAdapter } from '../saved_objets_database/memorize_adapter';
import { createKibanaServer } from '../../../../../../../test_utils/jest/contract_tests/servers';
import { Agent } from './adapter_type';

describe('Agent Adapter', () => {
  let adapter: AgentAdapter;
  let soAdapter: SODatabaseAdapterType;
  let servers: any;

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

  describe('create', () => {
    let agent: Agent;
    afterAll(async () => {
      await adapter.delete(agent);
    });
    it('should create a new agent', async () => {
      agent = await adapter.create({
        shared_id: 'agent1',
        active: false,
        access_token: 'TOKEN_1',
        config_id: 'config_id_1',
        config_shared_id: 'shared_config_id-1',
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
        config_id: 'config_id_1',
        config_shared_id: 'shared_config_id-1',
        type: 'EPHEMERAL',
        version: '1',
        local_metadata: {
          host: 'localhost',
        },
      });
    });
  });

  describe('update', () => {
    let agent: Agent;
    beforeAll(async () => {
      agent = await adapter.create({
        shared_id: 'agent1',
        active: false,
        access_token: 'TOKEN_1',
        config_id: 'config_id_1',
        config_shared_id: 'shared_config_id-1',
        type: 'EPHEMERAL',
        version: '1',
        local_metadata: {
          host: 'localhost',
        },
        user_provided_metadata: undefined,
        enrolled_at: '2019-08-05T19:35:14.861Z',
      });
    });
    afterAll(async () => {
      await adapter.delete(agent);
    });
    it('should allow to update an agent', async () => {
      await adapter.update(agent.id, {
        active: true,
      });

      const freshAgent = await adapter.getById(agent.id);
      expect(freshAgent).toBeDefined();
      expect(agent).toMatchObject({
        shared_id: 'agent1',
        active: false,
        access_token: 'TOKEN_1',
        config_id: 'config_id_1',
        config_shared_id: 'shared_config_id-1',
        type: 'EPHEMERAL',
        version: '1',
        local_metadata: {
          host: 'localhost',
        },
      });
    });
  });

  describe('delete', () => {
    let agent: Agent;
    beforeAll(async () => {
      agent = await adapter.create({
        shared_id: 'agent1',
        active: false,
        access_token: 'TOKEN_1',
        config_id: 'config_id_1',
        config_shared_id: 'shared_config_id-1',
        type: 'EPHEMERAL',
        version: '1',
        local_metadata: {
          host: 'localhost',
        },
        user_provided_metadata: undefined,
        enrolled_at: '2019-08-05T19:35:14.861Z',
      });
    });

    it('should delete an agent', async () => {
      await adapter.delete(agent);

      const freshAgent = await adapter.getById(agent.id);

      expect(freshAgent).toBeNull();
    });
  });
  describe('findEphemeralByConfigSharedId', () => {
    const agents: Agent[] = [];
    beforeAll(async () => {
      agents.push(
        await adapter.create({
          shared_id: 'agent1',
          active: false,
          access_token: 'TOKEN_1',
          config_id: 'config_id_1',
          config_shared_id: 'shared_config_id_1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'test.fr',
          },
          user_provided_metadata: {
            color: 'red',
          },
          enrolled_at: '2019-08-05T19:35:14.861Z',
        })
      );
      agents.push(
        await adapter.create({
          shared_id: 'agent2',
          active: false,
          access_token: 'TOKEN_1',
          config_id: 'config_id_1',
          config_shared_id: 'shared_config_id-1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'elastic.co',
          },
          user_provided_metadata: {
            color: 'blue',
          },
          enrolled_at: '2019-08-05T19:35:14.861Z',
        })
      );
    });

    afterAll(async () => {
      for (const agent of agents) {
        await adapter.delete(agent);
      }
    });

    it('should allow to find agent by config shared id', async () => {
      const agent = await adapter.findEphemeralByConfigSharedId('shared_config_id_1');
      expect(agent).toBeDefined();
      expect((agent as Agent).shared_id).toBe('agent1');
    });
  });
  describe('findByMetadata', () => {
    const agents: Agent[] = [];
    beforeAll(async () => {
      agents.push(
        await adapter.create({
          shared_id: 'agent1',
          active: false,
          access_token: 'TOKEN_1',
          config_id: 'config_id_1',
          config_shared_id: 'shared_config_id-1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'test.fr',
          },
          user_provided_metadata: {
            color: 'red',
          },
          enrolled_at: '2019-08-05T19:35:14.861Z',
        })
      );
      agents.push(
        await adapter.create({
          shared_id: 'agent2',
          active: false,
          access_token: 'TOKEN_1',
          config_id: 'config_id_1',
          config_shared_id: 'shared_config_id-1',
          type: 'EPHEMERAL',
          version: '1',
          local_metadata: {
            host: 'elastic.co',
          },
          user_provided_metadata: {
            color: 'blue',
          },
          enrolled_at: '2019-08-05T19:35:14.861Z',
        })
      );
    });

    afterAll(async () => {
      for (const agent of agents) {
        await adapter.delete(agent);
      }
    });

    it('should allow to find agents by local metadata', async () => {
      const agentsFound = await adapter.findByMetadata({
        local: {
          host: 'elastic.co',
        },
      });

      expect(agentsFound).toHaveLength(1);
      expect(agentsFound[0].shared_id).toBe('agent2');
    });

    it('should allow to find agents by user provided metadata', async () => {
      const agentsFound = await adapter.findByMetadata({
        userProvided: {
          color: 'red',
        },
      });

      expect(agentsFound).toHaveLength(1);
      expect(agentsFound[0].shared_id).toBe('agent1');
    });
  });
});
