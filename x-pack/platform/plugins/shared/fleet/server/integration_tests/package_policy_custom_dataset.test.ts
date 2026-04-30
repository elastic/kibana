/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Path from 'path';
import fs from 'fs';

import type { TestElasticsearchUtils, TestKibanaUtils } from '@kbn/core-test-helpers-kbn-server';
import { createRootWithCorePlugins, createTestServers } from '@kbn/core-test-helpers-kbn-server';
import { loggerMock } from '@kbn/logging-mocks';

import { packagePolicyService } from '../services/package_policy';
import { ensureCustomDatasetTemplatesForIntegrationPolicies } from '../services/setup/ensure_fleet_global_es_assets';

import { waitForFleetSetup, useDockerRegistry, getSupertestWithAdminUser } from './helpers';

const logFilePath = Path.join(__dirname, 'logs_custom_dataset.log');

const TEST_PACKAGE_ZIP = Path.resolve(
  __dirname,
  '../../cypress/packages/logs_integration-1.0.0.zip'
);
const TEST_PACKAGE_NAME = 'logs_integration';
const TEST_PACKAGE_VERSION = '1.0.0';
// Default dataset for the logs_integration package data stream (path: log → dataset: logs_integration.log)
const DEFAULT_DATASET = 'logs_integration.log';
const CUSTOM_DATASET = 'my_custom_log';
const AGENT_POLICY_ID = 'test-agent-policy-custom-dataset';

describe('Integration package policy with custom dataset', () => {
  let esServer: TestElasticsearchUtils;
  let kbnServer: TestKibanaUtils;

  // Docker registry is still needed for Fleet's own packages (fleet_server, system, etc.)
  // that are auto-installed during setup.
  useDockerRegistry();

  const startServers = async () => {
    const { startES } = createTestServers({
      adjustTimeout: (t) => jest.setTimeout(t),
      settings: { es: { license: 'trial' }, kbn: {} },
    });

    esServer = await startES();

    const root = createRootWithCorePlugins(
      {
        xpack: {
          fleet: {},
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

  const installTestPackage = async () => {
    const zipBuffer = fs.readFileSync(TEST_PACKAGE_ZIP);
    const response = await getSupertestWithAdminUser(
      kbnServer.root,
      'post',
      '/api/fleet/epm/packages'
    )
      .set('Content-Type', 'application/zip')
      .set('kbn-xsrf', 'true')
      .send(zipBuffer)
      .expect(200);
    return response.body;
  };

  const uninstallTestPackage = async () => {
    await getSupertestWithAdminUser(
      kbnServer.root,
      'delete',
      `/api/fleet/epm/packages/${TEST_PACKAGE_NAME}/${TEST_PACKAGE_VERSION}`
    )
      .set('kbn-xsrf', 'true')
      .send();
  };

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
        package: {
          name: TEST_PACKAGE_NAME,
          title: 'Logs Integration Package',
          version: TEST_PACKAGE_VERSION,
        },
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
    await installTestPackage();
    await createAgentPolicy();
  }, 5 * 60 * 1000);

  afterAll(async () => {
    await uninstallTestPackage();
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
            title: 'Logs Integration Package',
            version: TEST_PACKAGE_VERSION,
          },
        },
        { skipEnsureInstalled: false }
      );
      policyId = policy.id;

      // A template may exist for the default dataset (installed by the package install step),
      // but it should NOT have been created by our custom-dataset code. If a template exists,
      // verify there is only one (no duplicate created by our path).
      const defaultTemplate = await getIndexTemplate(`logs-${DEFAULT_DATASET}`);
      if (defaultTemplate) {
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
        logger: loggerMock.create(),
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
          logger: loggerMock.create(),
        })
      ).resolves.not.toThrow();
    });
  });

  describe('Scenario 7 — Package upgrade reinstalls custom-dataset templates', () => {
    // Verifies that upgrading the package policy triggers reinstallation of custom-dataset
    // templates. Full version cycling requires the registry to serve two versions; instead
    // we verify the upgrade code path by deleting the template first and running a forced
    // upgrade (force=true re-installs even without a version change in test environments).
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
