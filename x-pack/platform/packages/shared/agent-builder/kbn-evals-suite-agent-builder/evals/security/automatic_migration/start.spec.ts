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
  'Automatic Rule Migration - start skill',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'start/reprocess/resume intents activate automatic-migration-rules-start-migration but do NOT mutate without confirmation',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-start-no-silent-mutation',
            description: `Validates that start/reprocess/resume queries route to the
automatic-migration-rules-start-migration skill AND that the mutating tool
security.siem_migration.start_rule_migration is NOT invoked in a single turn.
Fixture-free: no migrations are seeded, so the agent reports no migrations found.`,
            examples: [
              {
                input: {
                  question: 'Start my rule migration named Splunk Q1.',
                },
                output: {
                  expected: `I looked for a rule migration named "Splunk Q1" but could not find any
rule migrations. There are currently no migrations available. Please verify the
migration name or create one from LaunchPad → Manage Automatic Migrations.`,
                },
                metadata: {
                  query_intent: 'Start Rule Migration',
                  expectedSkill: 'automatic-migration-rules-start-migration',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                  shouldNotCallToolId: 'security.siem_migration.start_rule_migration',
                },
              },
              {
                input: {
                  question: 'Reprocess the failed rules in my Splunk Q1 rule migration.',
                },
                output: {
                  expected: `I could not find a rule migration named "Splunk Q1".
There are currently no rule migrations available. Please verify the migration
name or create one from LaunchPad → Manage Automatic Migrations.`,
                },
                metadata: {
                  query_intent: 'Reprocess Rule Migration',
                  expectedSkill: 'automatic-migration-rules-start-migration',
                  shouldNotCallToolId: 'security.siem_migration.start_rule_migration',
                },
              },
              {
                input: {
                  question: 'Resume my stopped Sentinel rule migration.',
                },
                output: {
                  expected: `I could not find a stopped Sentinel rule migration.
There are currently no rule migrations available. Please verify the migration
name or create one from LaunchPad → Manage Automatic Migrations.`,
                },
                metadata: {
                  query_intent: 'Resume Rule Migration',
                  expectedSkill: 'automatic-migration-rules-start-migration',
                  shouldNotCallToolId: 'security.siem_migration.start_rule_migration',
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
          pending: 3,
          completed: 0,
          failed: 0,
        });
        teardown = seeded.cleanup;
      });

      evaluate.afterAll(async () => {
        await teardown?.();
      });

      evaluate(
        'start skill finds migration but asks for confirmation without mutating',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-start-grounded',
              description: `Validates that the start skill finds the seeded ready migration
and asks for connector/confirmation without calling start_rule_migration.
A single Splunk migration with 3 pending rules in ready status is seeded.`,
              examples: [
                {
                  input: {
                    question: 'Start my rule migration named Splunk Q1.',
                  },
                  output: {
                    expected: `I found your rule migration "Splunk Q1" with 3 pending rules. Before
I can start the translation, I need you to choose an AI connector.
Which connector would you like to use? Should ask this question with the connector list and if user wants to skip pre-built rules matching or not.`,
                  },
                  metadata: {
                    query_intent: 'Start Rule Migration - Grounded',
                    expectedSkill: 'automatic-migration-rules-start-migration',
                    expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                    shouldNotCallToolId: 'security.siem_migration.start_rule_migration',
                    requiredTerms: ['Splunk Q1'],
                  },
                },
                {
                  input: {
                    question: 'Reprocess the failed rules in my Splunk Q1 rule migration.',
                  },
                  output: {
                    expected: `I found your rule migration "Splunk Q1" but it has not been started
yet — there are no failed rules to reprocess. All 3 rules are pending.
Would you like to start the migration instead?`,
                  },
                  metadata: {
                    query_intent: 'Reprocess Rule Migration - Grounded',
                    expectedSkill: 'automatic-migration-rules-start-migration',
                    expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                    shouldNotCallToolId: 'security.siem_migration.start_rule_migration',
                    requiredTerms: ['Splunk Q1'],
                  },
                },
                {
                  input: {
                    question: 'Resume my stopped Splunk Q1 rule migration.',
                  },
                  output: {
                    expected: `I found your rule migration "Splunk Q1" but it is in ready status,
not stopped. It has not been started yet. Would you like to start
the translation? If so, please choose an AI connector.`,
                  },
                  metadata: {
                    query_intent: 'Resume Rule Migration - Grounded',
                    expectedSkill: 'automatic-migration-rules-start-migration',
                    expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                    shouldNotCallToolId: 'security.siem_migration.start_rule_migration',
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
