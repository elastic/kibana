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
  'Automatic Rule Migration - stop skill',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'stop intents activate automatic-migration-rules-stop-migration but do NOT mutate without confirmation',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-stop-no-silent-mutation',
            description: `Validates that stop queries route to the automatic-migration-rules-stop-migration
skill AND that stop_rule_migration is NOT called in a single turn.
Fixture-free: no migrations are seeded, so the agent reports no migrations found.`,
            examples: [
              {
                input: {
                  question: 'Stop my rule migration named Splunk Q1.',
                },
                output: {
                  expected: `I could not find a running rule migration named "Splunk Q1".
There are currently no rule migrations available. Please verify the migration
name or check the Automatic Migration UI.`,
                },
                metadata: {
                  query_intent: 'Stop Rule Migration',
                  expectedSkill: 'automatic-migration-rules-stop-migration',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                  shouldNotCallToolId: 'security.siem_migration.stop_rule_migration',
                },
              },
            ],
          },
        });
      }
    );

    // NOTE: a `running` migration requires in-memory task state and cannot be seeded via ES.
    // A grounded eval where stop_rule_migration IS called requires an integration-test harness
    // that starts a real translation task.

    evaluate.describe('already-finished migration: stop_rule_migration is NOT called', () => {
      let teardown: (() => Promise<void>) | undefined;

      evaluate.beforeAll(async ({ esClient, log }) => {
        const seeded = await seedRuleMigration({
          esClient,
          log,
          name: 'Splunk Q1 Finished',
          completed: 3,
          failed: 0,
          pending: 0,
        });
        teardown = seeded.cleanup;
      });

      evaluate.afterAll(async () => {
        await teardown?.();
      });

      evaluate('finished migration: stop is refused', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-stop-finished',
            description: `Validates that the stop skill does NOT call stop_rule_migration when the
migration is already finished (completed + failed === total).`,
            examples: [
              {
                input: {
                  question: 'Stop my rule migration named Splunk Q1 Finished.',
                },
                output: {
                  expected: `I found your rule migration "Splunk Q1 Finished" but it is already
finished — there is nothing to stop.`,
                },
                metadata: {
                  query_intent: 'Stop Rule Migration - Finished',
                  expectedSkill: 'automatic-migration-rules-stop-migration',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                  shouldNotCallToolId: 'security.siem_migration.stop_rule_migration',
                  requiredTerms: ['Splunk Q1 Finished'],
                },
              },
            ],
          },
        });
      });
    });

    evaluate.describe('already-stopped migration: stop_rule_migration is NOT called', () => {
      let teardown: (() => Promise<void>) | undefined;

      evaluate.beforeAll(async ({ esClient, log }) => {
        const seeded = await seedRuleMigration({
          esClient,
          log,
          name: 'Splunk Q1 Stopped',
          pending: 2,
          completed: 1,
          failed: 0,
          isStopped: true,
        });
        teardown = seeded.cleanup;
      });

      evaluate.afterAll(async () => {
        await teardown?.();
      });

      evaluate('stopped migration: stop is refused', async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-stop-already-stopped',
            description: `Validates that the stop skill does NOT call stop_rule_migration when the
migration is already stopped (last_execution.is_stopped: true).`,
            examples: [
              {
                input: {
                  question: 'Stop my rule migration named Splunk Q1 Stopped.',
                },
                output: {
                  expected: `I found your rule migration "Splunk Q1 Stopped" but it is already
stopped — there is nothing to stop.`,
                },
                metadata: {
                  query_intent: 'Stop Rule Migration - Already Stopped',
                  expectedSkill: 'automatic-migration-rules-stop-migration',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                  shouldNotCallToolId: 'security.siem_migration.stop_rule_migration',
                  requiredTerms: ['Splunk Q1 Stopped'],
                },
              },
            ],
          },
        });
      });
    });
  }
);
