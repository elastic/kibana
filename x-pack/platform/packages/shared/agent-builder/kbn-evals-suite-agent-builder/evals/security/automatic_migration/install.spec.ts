/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import type { KbnClient } from '@kbn/test';
import type { ToolingLog } from '@kbn/tooling-log';
import { seedRuleMigration } from './automatic_migration_fixtures';
import { evaluate } from './evaluate_setup';

const DETECTION_RULES_URL = '/api/detection_engine/rules';
const DETECTION_RULES_BULK_ACTION_URL = '/api/detection_engine/rules/_bulk_action';
const INSTALLED_RULE_NAMES = [
  'Translated Eval rule completed 1',
  'Translated Eval rule completed 2',
  'Translated Eval rule completed 3',
];

const cleanupInstalledEvalRules = async (kbnClient: KbnClient, log: ToolingLog) => {
  try {
    const existing = await kbnClient.request<{ data: Array<{ id: string; name: string }> }>({
      path: `${DETECTION_RULES_URL}/_find?per_page=1000`,
      method: 'GET',
    });
    const ids = existing.data.data
      .filter(({ name }) => INSTALLED_RULE_NAMES.includes(name))
      .map(({ id }) => id);

    if (ids.length > 0) {
      await kbnClient.request({
        path: DETECTION_RULES_BULK_ACTION_URL,
        method: 'POST',
        body: { action: 'delete', ids },
      });
    }
  } catch (error) {
    log.warning(
      `[automatic-migration-install-eval] Detection rule cleanup failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
};

evaluate.describe(
  'Automatic Rule Migration - install skill',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'install intent activates the install skill without silently mutating',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-install-no-silent-mutation',
            description: `Validates install routing and mandatory confirmation. Fixture-free:
the agent must resolve the migration before it can call the mutating install tool.`,
            examples: [
              {
                input: { question: 'Install all rules from my Splunk Q1 rule migration.' },
                output: {
                  expected: `I could not find a rule migration named "Splunk Q1". No rules were
installed. Verify the migration name in LaunchPad → Manage Automatic Migrations.`,
                },
                metadata: {
                  query_intent: 'Install Automatic Migration Rules',
                  expectedSkill: 'automatic-migration-rules-install-rules',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                  shouldNotCallToolId: 'security.siem_migration.install_migration_rules',
                },
              },
            ],
          },
        });
      }
    );

    evaluate.describe('integration readiness gate', () => {
      let teardown: (() => Promise<void>) | undefined;

      evaluate.beforeAll(async ({ esClient, log }) => {
        const seeded = await seedRuleMigration({
          esClient,
          log,
          name: 'Splunk Missing Integration',
          completed: 4,
          failed: 0,
          integrationIds: ['definitely_missing_eval_integration'],
        });
        teardown = seeded.cleanup;
      });

      evaluate.afterAll(async () => {
        await teardown?.();
      });

      evaluate(
        'missing integration recommends disabled installation and does not mutate',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-install-missing-integration',
              description: `Validates the install preflight: exact installable count, grouped
integration readiness, disabled fallback, and no mutation before explicit confirmation.`,
              examples: [
                {
                  input: {
                    question:
                      'Install all rules from Splunk Missing Integration and enable new rules.',
                  },
                  output: {
                    expected: `There are 4 installable rules. The required integration package
definitely_missing_eval_integration is not installed, so I cannot proceed with enabled
installation. I recommend installing the rules disabled, or installing and configuring the
integration first. Which option do you prefer?`,
                  },
                  metadata: {
                    query_intent: 'Install Rules With Missing Integration',
                    expectedSkill: 'automatic-migration-rules-install-rules',
                    expectedToolId: 'platform.fleet.get_integration_details',
                    shouldNotCallToolId: 'security.siem_migration.install_migration_rules',
                    requiredTerms: [
                      '4',
                      'definitely_missing_eval_integration',
                      'disabled',
                      'integration',
                    ],
                  },
                },
              ],
            },
          });
        }
      );
    });

    evaluate.describe('complete installation flow', () => {
      let teardownMigration: (() => Promise<void>) | undefined;
      let kbnClientForCleanup: KbnClient | undefined;
      let logForCleanup: ToolingLog | undefined;

      evaluate.beforeAll(async ({ esClient, kbnClient, log }) => {
        kbnClientForCleanup = kbnClient;
        logForCleanup = log;
        await cleanupInstalledEvalRules(kbnClient, log);
        const seeded = await seedRuleMigration({
          esClient,
          log,
          name: 'Splunk Install End To End',
          completed: 3,
          failed: 0,
        });
        teardownMigration = seeded.cleanup;
      });

      evaluate.afterAll(async () => {
        await teardownMigration?.();
        if (kbnClientForCleanup && logForCleanup) {
          await cleanupInstalledEvalRules(kbnClientForCleanup, logForCleanup);
        }
      });

      evaluate(
        'installs translated rules in one round with autoConfirm',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-install-end-to-end',
              description: `Validates that an explicit all-rules, disabled installation request
calls install_migration_rules in one round using autoConfirm and reports processed-count semantics.`,
              examples: [
                {
                  input: {
                    question: `Install all rules from my Splunk Install End To End rule migration.
Create the new rules disabled. I confirm the full scope and want you to proceed now. Don't ask questions.`,
                  },
                  output: {
                    expected: `Processed 3 rules from "Splunk Install End To End" with newly created
rules disabled. The response includes a sample of up to three processed custom rules with links.`,
                  },
                  metadata: {
                    query_intent: 'Install Rules End-to-end with autoConfirm',
                    expectedSkill: 'automatic-migration-rules-install-rules',
                    autoConfirm: true,
                    expectedToolId: 'security.siem_migration.install_migration_rules',
                    requiredTerms: ['3', 'processed', 'disabled'],
                  },
                },
              ],
            },
          });
        }
      );
    });
  }
);
