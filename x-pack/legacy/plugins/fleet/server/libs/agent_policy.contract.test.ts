/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import Slapshot from '@mattapperson/slapshot';
import { FrameworkUser, internalAuthData } from '../adapters/framework/adapter_types';
import { MemorizeSODatabaseAdapter } from '../adapters/saved_objects_database/memorize_adapter';
import { SODatabaseAdapter } from '../adapters/saved_objects_database/default';
import { FleetServerLib } from './types';
import { compose } from './compose/memorized';
import { Agent } from '../repositories/agents/types';

jest.mock('./framework');
jest.mock('./policy', () => ({
  PolicyLib: class PolicyLib {
    async getFullPolicy() {
      return {
        outputs: {
          default: {
            api_token: 'slfhsdlfhjjkshfkjh:sdfsdfsdfsdf',
            id: 'default',
            name: 'Default',
            type: 'elasticsearch',
            url: 'https://localhost:9200',
            tlsCert: 'ldsjfldsjfljsdalkfjl;ksadh;kjsdha;kjhslgkjhsdalkghasdkgh',
          },
        },
        streams: [
          {
            metricsets: ['container', 'cpu'],
            id: 'string',
            type: 'etc',
            output: {
              use_output: 'default',
            },
          },
        ],
      };
    }
  },
}));

function getUser(): FrameworkUser {
  return ({
    kind: 'authenticated',
    [internalAuthData]: {
      headers: {
        authorization: `Basic ${Buffer.from(`elastic:changeme`).toString('base64')}`,
      },
    },
  } as unknown) as FrameworkUser;
}

describe('AgentPolicy Lib', () => {
  let servers: any;
  let soAdapter: MemorizeSODatabaseAdapter;
  let libs: FleetServerLib;

  async function getAgentById(agentId: string) {
    return await soAdapter.get(getUser(), 'agents', agentId);
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
            actions: agent.actions || [],
          })
        ).id
      );
    }
    return agentIds;
  }

  async function clearFixtures() {
    const { saved_objects: savedObjects } = await soAdapter.find(getUser(), {
      type: 'enrollment_api_keys',
      perPage: 1000,
    });
    for (const so of savedObjects) {
      await soAdapter.delete(getUser(), 'enrollment_api_keys', so.id);
    }
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

  describe('updateAgentForPolicyId', () => {
    it('Should update the agent with the new policy', async () => {
      const [agentId] = await loadFixtures([
        {
          policy_id: 'default',
          active: true,
        },
      ]);

      await libs.agentsPolicy.updateAgentForPolicyId(getUser(), 'default', agentId);
      const agent = await getAgentById(agentId);

      expect(agent?.attributes?.actions[0]).toMatchObject({
        type: 'POLICY_CHANGE',
      });
    });
  });
  describe('updateAgentsForPolicyId', () => {
    it('Should updates all agents with the new policy', async () => {
      const [agent1Id, agent2Id, agent3Id] = await loadFixtures([
        {
          policy_id: 'default',
          active: true,
        },
        {
          policy_id: 'default',
          active: true,
        },
        {
          policy_id: 'policy2',
          active: true,
        },
      ]);

      await libs.agentsPolicy.updateAgentsForPolicyId(getUser(), 'default');
      const agent1 = await getAgentById(agent1Id);
      const agent2 = await getAgentById(agent2Id);
      const agent3 = await getAgentById(agent3Id);

      expect(agent1?.attributes?.actions[0]).toMatchObject({
        type: 'POLICY_CHANGE',
      });
      expect(agent2?.attributes?.actions[0]).toMatchObject({
        type: 'POLICY_CHANGE',
      });
      expect(agent3?.attributes?.actions).toHaveLength(0);
    });
  });
});
