/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import { range } from 'lodash';

import type { ISavedObjectsRepository } from '@kbn/core/server';
import type { TestElasticsearchUtils, createRoot } from '@kbn/core-test-helpers-kbn-server';
import { getSupertest, createRootWithCorePlugins } from '@kbn/core-test-helpers-kbn-server';

import type {
  AgentPolicySOAttributes,
  Installation,
  OutputSOAttributes,
  PackagePolicySOAttributes,
} from '../types';

type Root = ReturnType<typeof createRoot>;

const startAndWaitForFleetSetup = async (root: Root) => {
  const start = await root.start();

  const isFleetSetupRunning = async () => {
    const statusApi = getSupertest(root, 'get', '/api/status');
    const resp: any = await statusApi.send();
    const fleetStatus = resp.body?.status?.plugins?.fleet;
    if (fleetStatus?.meta?.error) {
      throw new Error(`Setup failed: ${JSON.stringify(fleetStatus)}`);
    }

    const isRunning = !fleetStatus || fleetStatus?.summary === 'Fleet is setting up';
    return isRunning;
  };

  while (await isFleetSetupRunning()) {
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  return start;
};

const createAndSetupRoot = async (config?: object, index?: number) => {
  const root = createRootWithCorePlugins(
    {
      xpack: {
        fleet: config,
      },
      logging: {
        appenders: {
          file: {
            type: 'file',
            fileName: Path.join(__dirname, `logs_${Math.floor(Math.random() * 100)}.log`),
            layout: {
              type: 'json',
            },
          },
        },
        loggers: [
          {
            name: 'root',
            appenders: ['file'],
          },
          {
            name: 'plugins.fleet',
            appenders: ['file'],
            level: 'info',
          },
        ],
      },
    },
    { oss: false }
  );

  await root.preboot();
  await root.setup();
  return root;
};

/**
 * Verifies that multiple Kibana instances running in parallel will not create duplicate preconfiguration objects.
 */
describe.skip('Fleet setup preconfiguration with multiple instances Kibana', () => {
  let esServer: TestElasticsearchUtils;
  let roots: Root[] = [];

  const registryUrl = 'https://epr.elastic.co/';

  const addRoots = async (n: number) => {
    const newRoots = await Promise.all(
      range(n).map((val, index) => createAndSetupRoot(preconfiguration, index))
    );
    newRoots.forEach((r) => roots.push(r));
    return newRoots;
  };

  const startRoots = async () => {
    return await Promise.all(roots.map(startAndWaitForFleetSetup));
  };

  const stopServers = async () => {
    for (const root of roots) {
      await root.shutdown();
    }
    roots = [];

    if (esServer) {
      await esServer.stop();
    }

    await new Promise((res) => setTimeout(res, 10000));
  };

  afterEach(async () => {
    await stopServers();
  });

  describe('preconfiguration setup', () => {
    it('sets up Fleet correctly', async () => {
      await addRoots(1);
      const [root1Start] = await startRoots();
      const soClient = root1Start.savedObjects.createInternalRepository();

      const esClient = root1Start.elasticsearch.client.asInternalUser;
      await new Promise((res) => setTimeout(res, 1000));

      try {
        const res = await esClient.search({
          index: '.fleet-policies',
          q: 'policy_id:policy-elastic-agent-on-cloud',
          sort: 'revision_idx:desc',
          _source: ['revision_idx', '@timestamp'],
        });
        // eslint-disable-next-line no-console
        console.log(JSON.stringify(res, null, 2));

        expect(res.hits.hits.length).toBeGreaterThanOrEqual(1);
        expect((res.hits.hits[0]._source as any)?.data?.inputs).not.toEqual([]);
      } catch (err) {
        if (err.statusCode === 404) {
          return;
        }
        throw err;
      }
      await expectFleetSetupState(soClient);
    });
  });

  const preconfiguration = {
    registryUrl,
    packages: [
      {
        name: 'fleet_server',
        version: 'latest',
      },
      {
        name: 'apm',
        version: 'latest',
      },
      {
        name: 'endpoint',
        version: 'latest',
      },
      {
        name: 'log',
        version: 'latest',
      },
    ],
    outputs: [
      {
        name: 'Preconfigured output',
        id: 'preconfigured-output',
        type: 'elasticsearch',
        hosts: ['http://127.0.0.1:9200'],
      },
    ],
    fleetServerHosts: [
      {
        id: 'fleet-server',
        name: 'Fleet Server',
        is_default: true,
        host_urls: ['https://192.168.178.216:8220'],
      },
    ],
    agentPolicies: [
      {
        name: 'Elastic Cloud agent policy',
        id: 'policy-elastic-agent-on-cloud',
        data_output_id: 'preconfigured-output',
        monitoring_output_id: 'preconfigured-output',
        is_managed: true,
        is_default_fleet_server: true,
        package_policies: [
          {
            name: 'elastic-cloud-fleet-server',
            package: {
              name: 'fleet_server',
            },
            inputs: [
              {
                type: 'fleet-server',
                keep_enabled: true,
                vars: [{ name: 'host', value: '127.0.0.1:8220', frozen: true }],
              },
            ],
          },
        ],
      },
    ],
  };

  async function expectFleetSetupState(soClient: ISavedObjectsRepository) {
    // Assert setup state
    const agentPolicies = await soClient.find<AgentPolicySOAttributes>({
      type: 'ingest-agent-policies',
      perPage: 10000,
    });
    expect(agentPolicies.saved_objects).toHaveLength(1);
    expect(agentPolicies.saved_objects.map((ap) => ap.attributes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'Elastic Cloud agent policy',
          is_managed: true,
          is_default_fleet_server: true,
          data_output_id: 'preconfigured-output',
        }),
      ])
    );

    const packagePolicies = await soClient.find<PackagePolicySOAttributes>({
      type: 'ingest-package-policies',
      perPage: 10000,
    });
    expect(packagePolicies.saved_objects.length).toBeGreaterThanOrEqual(1);
    expect(packagePolicies.saved_objects.map((pp) => pp.attributes.name)).toEqual(
      expect.arrayContaining(['elastic-cloud-fleet-server'])
    );

    const outputs = await soClient.find<OutputSOAttributes>({
      type: 'ingest-outputs',
      perPage: 10000,
    });
    expect(outputs.saved_objects).toHaveLength(2);
    expect(outputs.saved_objects.map((o) => o.attributes)).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'default',
          is_default: true,
          is_default_monitoring: true,
          type: 'elasticsearch',
          output_id: 'fleet-default-output',
          hosts: ['http://localhost:9200'],
        }),
        expect.objectContaining({
          name: 'Preconfigured output',
          is_default: false,
          is_default_monitoring: false,
          type: 'elasticsearch',
          output_id: 'preconfigured-output',
          hosts: ['http://127.0.0.1:9200'],
        }),
      ])
    );

    const packages = await soClient.find<Installation>({
      type: 'epm-packages',
      perPage: 10000,
    });
    expect(packages.saved_objects.length).toBeGreaterThanOrEqual(1);
    expect(packages.saved_objects.map((p) => p.attributes.name)).toEqual(
      expect.arrayContaining(['fleet_server'])
    );
  }
});
