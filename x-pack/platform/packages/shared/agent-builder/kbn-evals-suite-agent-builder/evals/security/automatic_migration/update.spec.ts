/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate_setup';
import { seedRuleMigration } from './automatic_migration_fixtures';

evaluate.describe(
  'Automatic Rule Migration - update skill',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'update intents activate automatic-migration-rules-update-migration but do NOT mutate without confirmation',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-update-no-silent-mutation',
            description: `Validates that update queries route to the automatic-migration-rules-update-migration
skill AND that update_rule_migration is NOT called in a single turn.
Fixture-free: no migrations are seeded, so the agent reports no migrations found.`,
            examples: [
              {
                input: {
                  question: "Rename my rule migration 'Splunk Q1' to 'Splunk Q1 - reviewed'.",
                },
                output: {
                  expected: `I could not find a rule migration named "Splunk Q1".
There are currently no rule migrations available. Please verify the migration
name or check the Automatic Migration UI.`,
                },
                metadata: {
                  query_intent: 'Rename Rule Migration',
                  expectedSkill: 'automatic-migration-rules-update-migration',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                  shouldNotCallToolId: 'security.siem_migration.update_rule_migration',
                },
              },
              {
                input: {
                  question:
                    "For the 'QRadar Prod' migration, change the default index pattern to logs-*,winlogbeat-*.",
                },
                output: {
                  expected: `I could not find a rule migration named "QRadar Prod".
There are currently no rule migrations available.`,
                },
                metadata: {
                  query_intent: 'Update Index Pattern',
                  expectedSkill: 'automatic-migration-rules-update-migration',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                  shouldNotCallToolId: 'security.siem_migration.update_rule_migration',
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'scope-limit: index-pattern rewrite in translated rules routes to UI, NOT update_rule_migration',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-update-scope-limit',
            description: `Validates that the update skill correctly identifies requests to rewrite
MISSING_INDEX_PATTERN_PLACEHOLDER in already-translated rules as out of scope and
directs the user to the Automatic Migration UI instead of calling update_rule_migration.`,
            examples: [
              {
                input: {
                  question:
                    'Fix the index patterns in the translated rules for my Splunk Q1 migration.',
                },
                output: {
                  expected: `Rewriting the index pattern placeholder in already-translated rules is
not supported through Agent Builder today. This operation is only available in the
Automatic Migration UI (LaunchPad → Manage Automatic Migrations). I can update the
migration's default index pattern for future runs — would that help?`,
                },
                metadata: {
                  query_intent: 'Index Pattern Rewrite - Scope Limit',
                  expectedSkill: 'automatic-migration-rules-update-migration',
                  shouldNotCallToolId: 'security.siem_migration.update_rule_migration',
                },
              },
              {
                input: {
                  question:
                    'Replace MISSING_INDEX_PATTERN_PLACEHOLDER in my Splunk Q1 migration rules with logs-*.',
                },
                output: {
                  expected: `Replacing MISSING_INDEX_PATTERN_PLACEHOLDER in translated rules is a
UI-only operation today. Please use LaunchPad → Manage Automatic Migrations to update
the translated rule queries.`,
                },
                metadata: {
                  query_intent: 'Placeholder Replace - Scope Limit',
                  expectedSkill: 'automatic-migration-rules-update-migration',
                  shouldNotCallToolId: 'security.siem_migration.update_rule_migration',
                },
              },
            ],
          },
        });
      }
    );

    evaluate.describe('grounded output (seeded migration data)', () => {
      let teardown: (() => Promise<void>) | undefined;

      evaluate.beforeAll(async ({ esClient, log }) => {
        const seeded = await seedRuleMigration({
          esClient,
          log,
          name: 'Splunk Q1',
          completed: 2,
          failed: 1,
          pending: 0,
        });
        teardown = seeded.cleanup;
      });

      evaluate.afterAll(async () => {
        await teardown?.();
      });

      evaluate(
        'update skill finds migration, prompts for confirmation, does not mutate in single turn',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-update-grounded',
              description: `Validates that the update skill finds the seeded migration and
confirms the rename before calling update_rule_migration.`,
              examples: [
                {
                  input: {
                    question: "Rename my migration 'Splunk Q1' to 'Splunk Q1 - reviewed'.",
                  },
                  output: {
                    expected: `I found your rule migration "Splunk Q1". I will rename it to
"Splunk Q1 - reviewed". Please confirm this change.`,
                  },
                  metadata: {
                    query_intent: 'Rename Rule Migration - Grounded',
                    expectedSkill: 'automatic-migration-rules-update-migration',
                    expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                    shouldNotCallToolId: 'security.siem_migration.update_rule_migration',
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
