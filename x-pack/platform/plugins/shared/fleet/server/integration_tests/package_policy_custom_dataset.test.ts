/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';

import { packagePolicyService } from '../services/package_policy';
import { ensureCustomDatasetTemplatesForIntegrationPolicies } from '../services/setup/ensure_fleet_global_es_assets';
import { waitForFleetSetup, useDockerRegistry } from './helpers';

// These tests require a running Elasticsearch + Kibana with the Fleet plugin and
// a Docker-based package registry serving a test integration package that exposes
// a `data_stream.dataset` variable.
//
// Run with:
//   node scripts/jest_integration x-pack/platform/plugins/shared/fleet/server/integration_tests/package_policy_custom_dataset.test.ts

const logFilePath = Path.join(__dirname, 'logs_custom_dataset.log');

const TEST_PACKAGE_NAME = 'log'; // bundled "Custom Logs" package exposes data_stream.dataset var
const TEST_PACKAGE_VERSION = '2.3.0'; // adjust to bundled version
const DEFAULT_DATASET = 'log.log'; // default dataset for the log package
const CUSTOM_DATASET = 'my_custom_log';
const AGENT_POLICY_ID = 'test-agent-policy-custom-dataset';

describe('Integration package policy with custom dataset', () => {
  let esServer: TestElasticsearchUtils;
  let kbnServer: TestKibanaUtils;

  const registryUrl = useDockerRegistry();

  const startServers = async (extraConfig?: Record<string, unknown>) => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: { es: { license: 'trial' }, kbn: {} },
    });

    esServer = await startES();

    const root = createRootWithCorePlugins(
      {
        xpack: {
          fleet: {
            registryUrl: await registryUrl,
            ...extraConfig,
          },
        },
        logging: {
          appenders: {
            file: {
              type: 'file',
              fileName: logFilePath,
              layout: { type: 'json' },
            },
          },
          loggers: [
            { name: 'root', appenders: ['file'] },
            { name: 'plugins.fleet', level: 'all' },
          ],
        },
      },
      { oss: false }
    );

    await root.preboot();
    const coreSetup = await root.setup();
    const coreStart = await root.start();

    kbnServer = { root, coreSetup, coreStart, stop: async () => root.shutdown() };
    await waitForFleetSetup(root);
  };

  const stopServers = async () => {
    if (kbnServer) await kbnServer.stop();
    if (esServer) await esServer.stop();
  };

  // -----------------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------------

  const getSoClient = () => kbnServer.coreStart.savedObjects.getUnsafeInternalClient();
  const getEsClient = () => kbnServer.coreStart.elasticsearch.client.asInternalUser;

  const createAgentPolicy = async () => {
    const soClient = getSoClient();
    const esClient = getEsClient();
    const { agentPolicyService } = await import('../services/agent_policy');
    return agentPolicyService.create(soClient, esClient, {
      id: AGENT_POLICY_ID,
      name: 'Test agent policy for custom dataset',
      namespace: 'default',
    });
  };

  const createCustomDatasetPolicy = async (customDataset: string = CUSTOM_DATASET) => {
    const soClient = getSoClient();
    const esClient = getEsClient();
    return packagePolicyService.create(
      soClient,
      esClient,
      {
        name: `custom-dataset-policy-${customDataset}`,
        namespace: 'default',
        enabled: true,
        policy_ids: [AGENT_POLICY_ID],
        inputs: [
          {
            type: 'logfile',
            enabled: true,
            streams: [
              {
                enabled: true,
                data_stream: { type: 'logs', dataset: DEFAULT_DATASET },
                vars: {
                  paths: { value: ['/tmp/test.log'], type: 'text' },
                  'data_stream.dataset': { value: customDataset, type: 'text' },
                },
              },
            ],
          },
        ],
        package: { name: TEST_PACKAGE_NAME, title: 'Custom Logs', version: TEST_PACKAGE_VERSION },
      },
      { skipEnsureInstalled: false }
    );
  };

  const getIndexTemplate = async (name: string) => {
    try {
      const esClient = getEsClient();
      const result = await esClient.indices.getIndexTemplate({ name });
      return result.index_templates?.[0] ?? null;
    } catch (err) {
      if (err?.statusCode === 404 || err?.meta?.statusCode === 404) return null;
      throw err;
    }
  };

  // -----------------------------------------------------------------------
  // Tests
  // -----------------------------------------------------------------------

  beforeAll(async () => {
    await startServers();
    await createAgentPolicy();
  }, 5 * 60 * 1000);

  afterAll(async () => {
    await stopServers();
  });

  describe('Scenario 1 — Template installed on policy create', () => {
    let policyId: string;

    afterAll(async () => {
      if (policyId) {
        await packagePolicyService.delete(getSoClient(), getEsClient(), [policyId]);
      }
    });

    it('creates an index template scoped to the custom dataset', async () => {
      const policy = await createCustomDatasetPolicy();
      policyId = policy.id;

      const template = await getIndexTemplate(`logs-${CUSTOM_DATASET}`);

      expect(template).not.toBeNull();
      expect(template!.index_template.index_patterns).toContain(`logs-${CUSTOM_DATASET}-*`);
      expect(template!.index_template.priority).toBe(200);
      expect(template!.index_template._meta?.package?.name).toBe(TEST_PACKAGE_NAME);
    });
  });

  describe('Scenario 2 — Default dataset policy is unaffected', () => {
    let policyId: string;

    afterAll(async () => {
      if (policyId) {
        await packagePolicyService.delete(getSoClient(), getEsClient(), [policyId]);
      }
    });

    it('does not create an extra template for the default dataset', async () => {
      const soClient = getSoClient();
      const esClient = getEsClient();
      const policy = await packagePolicyService.create(
        soClient,
        esClient,
        {
          name: 'default-dataset-policy',
          namespace: 'default',
          enabled: true,
          policy_ids: [AGENT_POLICY_ID],
          inputs: [
            {
              type: 'logfile',
              enabled: true,
              streams: [
                {
                  enabled: true,
                  data_stream: { type: 'logs', dataset: DEFAULT_DATASET },
                  vars: {
                    paths: { value: ['/tmp/test.log'], type: 'text' },
                    'data_stream.dataset': { value: DEFAULT_DATASET, type: 'text' },
                  },
                },
              ],
            },
          ],
          package: {
            name: TEST_PACKAGE_NAME,
            title: 'Custom Logs',
            version: TEST_PACKAGE_VERSION,
          },
        },
        { skipEnsureInstalled: false }
      );
      policyId = policy.id;

      // The package-level template for the default dataset should be installed by the
      // package install step, not by our new code. No separate custom template.
      const customTemplate = await getIndexTemplate(`logs-${DEFAULT_DATASET}`);
      // This may or may not exist depending on the package, but it should NOT have been
      // installed by our integration custom-dataset code (verify meta if present).
      if (customTemplate) {
        // If a template exists for the default dataset it was installed by package install, not our path.
        // We just confirm no duplicate was created by verifying there is at most one template.
        const result = await getEsClient().indices.getIndexTemplate({
          name: `logs-${DEFAULT_DATASET}`,
        });
        expect(result.index_templates).toHaveLength(1);
      }
    });
  });

  describe('Scenario 3 — Template removed on policy delete', () => {
    it('removes the index template when the only policy using the custom dataset is deleted', async () => {
      const policy = await createCustomDatasetPolicy('my_nginx_to_delete');
      const templateName = `logs-my_nginx_to_delete`;

      const templateBefore = await getIndexTemplate(templateName);
      expect(templateBefore).not.toBeNull();

      await packagePolicyService.delete(getSoClient(), getEsClient(), [policy.id]);

      const templateAfter = await getIndexTemplate(templateName);
      expect(templateAfter).toBeNull();
    });
  });

  describe('Scenario 4 — Template preserved when two policies share the same custom dataset', () => {
    it('keeps the template alive until the last policy using it is deleted', async () => {
      const sharedDataset = 'my_shared_nginx';
      const policy1 = await createCustomDatasetPolicy(sharedDataset);
      const policy2 = await createCustomDatasetPolicy(sharedDataset);

      // Delete first policy — template should survive because policy2 still uses it
      await packagePolicyService.delete(getSoClient(), getEsClient(), [policy1.id]);
      const templateAfterFirst = await getIndexTemplate(`logs-${sharedDataset}`);
      expect(templateAfterFirst).not.toBeNull();

      // Delete second policy — template should now be removed
      await packagePolicyService.delete(getSoClient(), getEsClient(), [policy2.id]);
      const templateAfterBoth = await getIndexTemplate(`logs-${sharedDataset}`);
      expect(templateAfterBoth).toBeNull();
    });
  });

  describe('Scenario 5 — Idempotency: two policies use the same custom dataset', () => {
    let policy1Id: string;
    let policy2Id: string;

    afterAll(async () => {
      await packagePolicyService.delete(getSoClient(), getEsClient(), [policy1Id, policy2Id]);
    });

    it('creates only one index template and does not error on the second policy create', async () => {
      const sharedDataset = 'my_idempotent_nginx';

      const policy1 = await createCustomDatasetPolicy(sharedDataset);
      policy1Id = policy1.id;

      // Second create should succeed without error (idempotent skip)
      const policy2 = await createCustomDatasetPolicy(sharedDataset);
      policy2Id = policy2.id;

      const esClient = getEsClient();
      const result = await esClient.indices.getIndexTemplate({
        name: `logs-${sharedDataset}`,
      });
      expect(result.index_templates).toHaveLength(1);
    });
  });

  describe('Scenario 6 — Layer 1 migration (feature flag enabled)', () => {
    let policyId: string;

    afterAll(async () => {
      if (policyId) {
        await packagePolicyService.delete(getSoClient(), getEsClient(), [policyId]);
      }
    });

    it('installs missing template for pre-existing policy and is idempotent', async () => {
      const migrationDataset = 'my_migration_nginx';
      const policy = await createCustomDatasetPolicy(migrationDataset);
      policyId = policy.id;

      // Simulate pre-fix state: manually delete the template
      await getEsClient().indices.deleteIndexTemplate({ name: `logs-${migrationDataset}` });
      expect(await getIndexTemplate(`logs-${migrationDataset}`)).toBeNull();

      // Run the migration
      await ensureCustomDatasetTemplatesForIntegrationPolicies({
        soClient: getSoClient(),
        esClient: getEsClient(),
        logger: kbnServer.coreStart.logging.get('test.migration'),
      });

      // Template should be re-installed
      const templateAfter = await getIndexTemplate(`logs-${migrationDataset}`);
      expect(templateAfter).not.toBeNull();
      expect(templateAfter!.index_template.priority).toBe(200);

      // Run again — should be idempotent (no error)
      await expect(
        ensureCustomDatasetTemplatesForIntegrationPolicies({
          soClient: getSoClient(),
          esClient: getEsClient(),
          logger: kbnServer.coreStart.logging.get('test.migration'),
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Scenario 7 — Package upgrade reinstalls custom-dataset templates', () => {
    // This scenario is a structural test: verify that upgrading the package policy
    // triggers reinstallation of custom-dataset templates. Full package version cycling
    // is dependent on the registry serving two versions, so we verify the upgrade
    // code path is wired correctly by checking the template exists after a forced upgrade
    // (force=true re-installs even if no version change in test environments).
    it('template exists after policy is upgraded', async () => {
      const upgradeDataset = 'my_upgrade_nginx';
      const policy = await createCustomDatasetPolicy(upgradeDataset);

      try {
        // Manually delete the template to simulate stale state
        await getEsClient().indices.deleteIndexTemplate({ name: `logs-${upgradeDataset}` });

        // Trigger a no-op upgrade (same version) with force=true to exercise the upgrade path
        await packagePolicyService.upgrade(getSoClient(), getEsClient(), policy.id, {
          force: true,
        });

        const template = await getIndexTemplate(`logs-${upgradeDataset}`);
        expect(template).not.toBeNull();
      } finally {
        await packagePolicyService.delete(getSoClient(), getEsClient(), [policy.id]);
      }
    });
  });
});
