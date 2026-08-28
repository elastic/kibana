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
  'Automatic Rule Migration - delete skill',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'delete intents activate automatic-migration-rules-delete-migration but do NOT mutate without confirmation',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-delete-no-tool-call',
            description: `Validates that delete queries route to the automatic-migration-rules-delete-migration
skill AND that delete_rule_migration is NOT called in a single turn.
Fixture-free: no migrations are seeded, so the agent reports no migrations found.`,
            examples: [
              {
                input: {
                  question: 'Delete my rule migration named Splunk Q1.',
                },
                output: {
                  expected: `I could not find a rule migration named "Splunk Q1".
There are currently no rule migrations available. Please verify the migration
name or check the Automatic Migration UI.`,
                },
                metadata: {
                  query_intent: 'Delete Rule Migration',
                  expectedSkill: 'automatic-migration-rules-delete-migration',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                  shouldNotCallToolId: 'security.siem_migration.delete_rule_migration',
                  autoConfirm: true,
                },
              },
            ],
          },
        });
      }
    );

    evaluate.describe('grounded output - with seeded migration', () => {
      let teardown: (() => Promise<void>) | undefined;

      evaluate.beforeAll(async ({ esClient, log }) => {
        const seeded = await seedRuleMigration({
          esClient,
          log,
          name: 'Splunk Q1 Stopped',
          pending: 0,
          completed: 3,
          failed: 0,
          isStopped: true,
        });
        teardown = seeded.cleanup;
      });

      evaluate.afterAll(async () => {
        await teardown?.();
      });

      evaluate(
        'delete skill finds stopped migration and asks for confirmation without mutating',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-delete-grounded',
              description: `Validates that the delete skill finds a non-running migration,
warns about the irreversible destructive action, and requires confirmation
before calling delete_rule_migration.`,
              examples: [
                {
                  input: {
                    question: 'Delete my rule migration named Splunk Q1 Stopped.',
                  },
                  output: {
                    expected: `I found your rule migration "Splunk Q1 Stopped". This action is
permanent and irreversible — all translated rule items will be deleted.
Please confirm you want to delete "Splunk Q1 Stopped".`,
                  },
                  metadata: {
                    query_intent: 'Delete Rule Migration - Grounded',
                    expectedSkill: 'automatic-migration-rules-delete-migration',
                    expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                    shouldNotCallToolId: 'security.siem_migration.delete_rule_migration',
                    requiredTerms: ['Splunk Q1 Stopped', 'irreversible'],
                  },
                },
              ],
            },
          });
        }
      );
    });

    evaluate.describe('complete flow: refuses to delete a migration that was just started', () => {
      let teardownMigration: (() => Promise<void>) | undefined;

      evaluate.beforeAll(async ({ esClient, log }) => {
        const seeded = await seedRuleMigration({
          esClient,
          log,
          name: 'Sentinel Migration',
          vendor: 'microsoft-sentinel',
          pending: 3,
          completed: 0,
          failed: 0,
        });
        teardownMigration = seeded.cleanup;
      });

      evaluate.afterAll(async () => {
        await teardownMigration?.();
      });

      evaluate(
        'agent starts migration then refuses to delete it because it is now running',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-start-then-delete-refused',
              description: `Validates that when the user asks to start a migration and then delete it
once running, the agent starts the migration (via autoConfirm) but refuses the
subsequent delete request because the migration is now running — telling the user
it must be stopped before deletion.`,
              examples: [
                {
                  input: {
                    question: `Start my Sentinel Migration using Opus 4.6 connector, skip pre-built rule matching,
and proceed even if there are missing resources. Once it is running, delete it. Don't ask questions.`,
                  },
                  output: {
                    expected: `I started your Sentinel Migration. However, I cannot delete it right now
because the migration is currently running. You must stop the migration first before it can be deleted.`,
                  },
                  metadata: {
                    query_intent: 'Start then Delete Running Migration',
                    expectedSkill: 'automatic-migration-rules-start-migration',
                    autoConfirm: true,
                    expectedToolId: 'security.siem_migration.start_rule_migration',
                    shouldNotCallToolId: 'security.siem_migration.delete_rule_migration',
                    requiredTerms: ['running'],
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
