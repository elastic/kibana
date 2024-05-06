/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { v4 as uuidv4 } from 'uuid';

import type {
  KibanaRequest,
  SavedObjectsClientContract,
  ElasticsearchClient,
} from '@kbn/core/server';
import type { SearchTotalHits } from '@elastic/elasticsearch/lib/api/types';

import { SECURITY_EXTENSION_ID } from '@kbn/core-saved-objects-server';

import {
  type TestElasticsearchUtils,
  type TestKibanaUtils,
  createTestServers,
  createRootWithCorePlugins,
} from '@kbn/core-test-helpers-kbn-server';

import { AGENT_POLICY_SAVED_OBJECT_TYPE, FLEET_AGENT_POLICIES_SCHEMA_VERSION } from '../constants';
import { upgradeAgentPolicySchemaVersion } from '../services/setup/upgrade_agent_policy_schema_version';
import { AGENT_POLICY_INDEX } from '../../common';
import { agentPolicyService } from '../services';

import { useDockerRegistry, waitForFleetSetup } from './helpers';

const fakeRequest = {
  headers: {},
  getBasePath: () => '',
  path: '/',
  route: { settings: {} },
  url: {
    href: '/',
  },
  raw: {
    req: {
      url: '/',
    },
  },
} as unknown as KibanaRequest;

describe('upgrade agent policy schema version', () => {
  let esServer: TestElasticsearchUtils;
  let kbnServer: TestKibanaUtils;

  const registryUrl = useDockerRegistry();

  const startServers = async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: {
        es: {
          license: 'trial',
        },
        kbn: {},
      },
    });

    esServer = await startES();
    const startKibana = async () => {
      const root = createRootWithCorePlugins(
        {
          xpack: {
            fleet: {
              registryUrl,
              packages: [
                {
                  name: 'fleet_server',
                  version: 'latest',
                },
                {
                  name: 'system',
                  version: 'latest',
                },
              ],
            },
          },
        },
        { oss: false }
      );

      await root.preboot();
      const coreSetup = await root.setup();
      const coreStart = await root.start();

      return {
        root,
        coreSetup,
        coreStart,
        stop: async () => await root.shutdown(),
      };
    };
    kbnServer = await startKibana();

    await waitForFleetSetup(kbnServer.root);
  };

  const stopServers = async () => {
    if (kbnServer) {
      await kbnServer.stop();
    }

    if (esServer) {
      await esServer.stop();
    }

    await new Promise((res) => setTimeout(res, 10000));
  };

  // Share the same servers for all the test to make test a lot faster (but test are not isolated anymore)
  beforeAll(async () => {
    await startServers();
  });

  afterAll(async () => {
    await stopServers();
  });

  describe('with package installed with outdated schema version', () => {
    let soClient: SavedObjectsClientContract;
    let esClient: ElasticsearchClient;

    beforeAll(async () => {
      soClient = kbnServer.coreStart.savedObjects.getScopedClient(fakeRequest, {
        excludedExtensions: [SECURITY_EXTENSION_ID],
      });
      esClient = kbnServer.coreStart.elasticsearch.client.asInternalUser;
    });

    it('should correctly upgrade schema version', async () => {
      await esClient.indices.create({ index: AGENT_POLICY_INDEX });
      let esRes = await esClient.search({ index: AGENT_POLICY_INDEX });
      expect((esRes.hits.total as SearchTotalHits).value).toBe(0);

      await soClient.bulkCreate([
        // up-to-date schema_version
        {
          type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          id: uuidv4(),
          attributes: {
            schema_version: FLEET_AGENT_POLICIES_SCHEMA_VERSION,
            revision: 1,
          },
        },
        // out-of-date schema_version
        {
          type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          id: uuidv4(),
          attributes: {
            schema_version: '0.0.1',
            revision: 1,
          },
        },
        // missing schema_version
        {
          type: AGENT_POLICY_SAVED_OBJECT_TYPE,
          id: uuidv4(),
          attributes: {
            revision: 1,
          },
        },
      ]);

      await upgradeAgentPolicySchemaVersion(soClient);

      const policies = await agentPolicyService.list(soClient, {
        kuery: `${AGENT_POLICY_SAVED_OBJECT_TYPE}.schema_version:${FLEET_AGENT_POLICIES_SCHEMA_VERSION}`,
      });
      // all 3 should be up-to-date after upgrade
      expect(policies.total).toBe(3);

      esRes = await esClient.search({
        index: AGENT_POLICY_INDEX,
        body: { query: { match: { revision_idx: 2 } } },
      });
      // since only 2 were updated, only 2 should be written
      expect((esRes.hits.total as SearchTotalHits).value).toBe(2);
    });
  });
});
