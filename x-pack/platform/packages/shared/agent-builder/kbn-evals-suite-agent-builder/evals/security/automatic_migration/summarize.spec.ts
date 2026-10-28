/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate_setup';
import { seedMissingResources, seedRuleMigration } from './automatic_migration_fixtures';

evaluate.describe(
  'Automatic Rule Migration - summarize skill',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'overview queries activate the automatic-migration-rules-summarize skill and call get_all_rule_migration_stats',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-summarize',
            description: `Validates that overview/summary queries route to the automatic-migration-rules-summarize
skill and invoke security.siem_migration.get_all_rule_migration_stats. Fixture-free:
no migrations are seeded, so the tool returns empty and the agent reports that no
rule migrations exist.`,
            examples: [
              {
                input: {
                  question: 'How are my Automatic Rule Migrations doing?',
                },
                output: {
                  expected: `There are currently no rule migrations available.
The tool returned total: 0 and an empty migrations list.
You can start a new migration from LaunchPad → Manage Automatic Migrations.`,
                },
                metadata: {
                  query_intent: 'Rule Migration Overview',
                  expectedSkill: 'automatic-migration-rules-summarize',
                  expectedOnlyToolId: 'security.siem_migration.get_all_rule_migration_stats',
                },
              },
              {
                input: {
                  question: 'Give me a summary of all my rule migrations.',
                },
                output: {
                  expected: `There are currently no rule migrations available.
The tool get_all_rule_migration_stats returned total: 0 with an empty list.
You can create a migration from LaunchPad → Manage Automatic Migrations.`,
                },
                metadata: {
                  query_intent: 'Rule Migration Overview',
                  expectedSkill: 'automatic-migration-rules-summarize',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                },
              },
              {
                input: {
                  question:
                    'Show me the translation progress for my rule migration named Splunk Q1.',
                },
                output: {
                  expected: `I looked for a rule migration named "Splunk Q1" but could not find one.
There are currently no rule migrations available.
Please verify the migration name.`,
                },
                metadata: {
                  query_intent: 'Rule Migration Drill-in',
                  expectedSkill: 'automatic-migration-rules-summarize',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                },
              },
            ],
          },
        });
      }
    );

    evaluate.describe('missing resources (seeded migration + missing resources)', () => {
      const teardowns: Array<() => Promise<void>> = [];

      evaluate.beforeAll(async ({ esClient, log }) => {
        const seeded = await seedRuleMigration({
          esClient,
          log,
          name: 'Splunk Migration',
          completed: 1,
          partial: 2,
          failed: 0,
        });
        teardowns.push(seeded.cleanup);
        teardowns.push(
          await seedMissingResources({
            esClient,
            log,
            migrationId: seeded.fixtures.migrationId,
            resources: [
              { type: 'macro', name: 'windows_security_index' },
              { type: 'macro', name: 'okta_logs' },
              { type: 'lookup', name: 'privileged_users' },
            ],
          })
        );
      });

      evaluate.afterAll(async () => {
        for (const teardown of teardowns) {
          await teardown();
        }
      });

      evaluate(
        'missing resources questions list the resources from get_missing_rule_migration_resources',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-summarize-missing-resources',
              description: `Validates that asking for a migration's missing resources routes to the read-only
automatic-migration-rules-summarize skill, calls get_missing_rule_migration_resources, and lists the
resources grouped by type, instead of inferring them from per-rule translation results.`,
              examples: [
                {
                  input: {
                    question:
                      'Show me the missing resources from the migration named Splunk Migration',
                  },
                  output: {
                    expected: `The rule migration "Splunk Migration" is missing 3 resources.
Macros (2): windows_security_index, okta_logs.
Lookups (1): privileged_users.
Upload them in the Automatic Migration UI and reprocess the affected rules.`,
                  },
                  metadata: {
                    query_intent: 'Rule Migration Missing Resources',
                    expectedSkill: 'automatic-migration-rules-summarize',
                    expectedToolId: 'security.siem_migration.get_missing_rule_migration_resources',
                    shouldNotCallToolId: 'security.siem_migration.get_migration_rules',
                  },
                },
              ],
            },
          });
        }
      );
    });

    evaluate.describe('grounded output (seeded migration data)', () => {
      let teardown: (() => Promise<void>) | undefined;

      evaluate.beforeAll(async ({ esClient, log }) => {
        const seeded = await seedRuleMigration({ esClient, log, completed: 2, failed: 1 });
        teardown = seeded.cleanup;
      });

      evaluate.afterAll(async () => {
        await teardown?.();
      });

      evaluate(
        'summarize response references seeded migration data',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-summarize-grounded',
              description: `Validates that the summarize skill produces factually correct output
referencing real migration data. A single finished Splunk migration with
3 rules (2 completed, 1 failed) is seeded.`,
              examples: [
                {
                  input: {
                    question: 'How are my rule migrations doing?',
                  },
                  output: {
                    expected: `You have 1 rule migration named "Splunk Q1" from Splunk. It has
finished translation. Of the 3 rules: 2 completed successfully
and 1 failed.`,
                  },
                  metadata: {
                    query_intent: 'Rule Migration Overview - Grounded',
                    expectedSkill: 'automatic-migration-rules-summarize',
                    expectedOnlyToolId: 'security.siem_migration.get_all_rule_migration_stats',
                    requiredTerms: ['Splunk Q1'],
                  },
                },
                {
                  input: {
                    question:
                      'Show me the translation progress for my rule migration named Splunk Q1.',
                  },
                  output: {
                    expected: `Your rule migration "Splunk Q1" has finished. Out of 3 total rules:
2 were fully translated and 1 failed translation. The migration
source is Splunk. No resources are missing.`,
                  },
                  metadata: {
                    query_intent: 'Rule Migration Drill-in - Grounded',
                    expectedSkill: 'automatic-migration-rules-summarize',
                    expectedToolId: 'security.siem_migration.get_missing_rule_migration_resources',
                    requiredTerms: ['Splunk Q1'],
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
