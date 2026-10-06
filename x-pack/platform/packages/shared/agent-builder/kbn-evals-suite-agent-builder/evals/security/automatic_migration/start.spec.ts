/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate_setup';
import { seedRuleMigration, seedMissingResources } from './automatic_migration_fixtures';

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
      let cleanupResources: (() => Promise<void>) | undefined;
      let seededMigrationId: string;

      evaluate.beforeAll(async ({ esClient, log }) => {
        const seeded = await seedRuleMigration({
          esClient,
          log,
          pending: 3,
          completed: 0,
          failed: 0,
        });
        seededMigrationId = seeded.fixtures.migrationId;
        teardown = seeded.cleanup;

        // Seed missing resources so the pre-flight check has something to report.
        // Omitting the 'content' field makes the server treat these as missing (hasContent: false).
        cleanupResources = await seedMissingResources({
          esClient,
          log,
          migrationId: seededMigrationId,
          resources: [
            { type: 'lookup', name: 'Sample Lookup 1' },
            { type: 'macro', name: 'sample_macro' },
          ],
        });
      });

      evaluate.afterAll(async () => {
        await cleanupResources?.();
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

      evaluate(
        'pre-flight: get_missing_rule_migration_resources is called before start on a fresh START',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-start-preflight',
              description: `Validates that the start skill calls get_missing_rule_migration_resources
                            as a pre-flight check on a fresh START (ready migration) before calling start_rule_migration.
                            The seeded migration has no uploaded resources, so the missing-resources response is empty
                            and the agent proceeds to the connector step without a blocking warning.`,
              examples: [
                {
                  input: {
                    question: 'Start my rule migration named Splunk Q1.',
                  },
                  output: {
                    expected: `The following resources are missing, so rules referencing them may fail to translate or produce partial results:
                                - macros : sample_macro
                                - lookups : sample lookup 1
                              you can upload them in launchpad → manage automatic migrations`,
                  },
                  metadata: {
                    query_intent: 'Start Rule Migration - Pre-flight check',
                    expectedSkill: 'automatic-migration-rules-start-migration',
                    expectedToolId: 'security.siem_migration.get_missing_rule_migration_resources',
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

    evaluate.describe('RESUME a stopped migration', () => {
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

      evaluate(
        'pre-flight: get_missing_rule_migration_resources is NOT called on RESUME',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-resume-skips-preflight',
              description: `Validates that the start skill does NOT call get_missing_rule_migration_resources
when the user asks to resume a stopped migration. Pre-flight is start-only; resume
picks up from where the migration left off without re-checking resources.`,
              examples: [
                {
                  input: {
                    question: 'Resume my stopped rule migration named Splunk Q1 Stopped.',
                  },
                  output: {
                    expected: `I found your stopped rule migration "Splunk Q1 Stopped".
I will resume it using the same settings as the last run.
Please confirm you want to resume.`,
                  },
                  metadata: {
                    query_intent: 'Resume Rule Migration - Pre-flight should be skipped',
                    expectedSkill: 'automatic-migration-rules-start-migration',
                    expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                    shouldNotCallToolId:
                      'security.siem_migration.get_missing_rule_migration_resources',
                    requiredTerms: ['Splunk Q1 Stopped'],
                  },
                },
              ],
            },
          });
        }
      );
    });

    evaluate.describe('complete flow: reprocess', () => {
      evaluate.describe('reprocesses failed rules', () => {
        let teardownMigration: (() => Promise<void>) | undefined;

        evaluate.beforeAll(async ({ esClient, log }) => {
          const seeded = await seedRuleMigration({
            esClient,
            log,
            name: 'Splunk Reprocess',
            vendor: 'splunk',
            pending: 0,
            completed: 2,
            failed: 3,
          });
          teardownMigration = seeded.cleanup;
        });

        evaluate.afterAll(async () => {
          await teardownMigration?.();
        });

        evaluate('REPROCESSES failed rules', async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-reprocess-end-to-end',
              description: `Validates that when the user asks to reprocess failed rules and supplies
the connector upfront, the start skill calls start_rule_migration with the correct
retry settings in a single turn.`,
              examples: [
                {
                  input: {
                    question: `Reprocess the failed rules in my Splunk Reprocess migration using Opus 4.6. Don't ask any questions.`,
                  },
                  output: {
                    expected: `I have reprocessed the 3 failed rules in your "Splunk Reprocess" migration
using the Opus 4.6 connector. The reprocessing is running asynchronously.`,
                  },
                  metadata: {
                    query_intent: 'Reprocess Rule Migration - End-to-end with autoConfirm',
                    expectedSkill: 'automatic-migration-rules-start-migration',
                    autoConfirm: true,
                    expectedToolId: 'security.siem_migration.start_rule_migration',
                    requiredTerms: ['asynchronously'],
                  },
                },
              ],
            },
          });
        });
      });

      evaluate.describe('reprocesses not_fully_translated rules', () => {
        let teardownMigration: (() => Promise<void>) | undefined;

        evaluate.beforeAll(async ({ esClient, log }) => {
          const seeded = await seedRuleMigration({
            esClient,
            log,
            name: 'Splunk Partial',
            vendor: 'splunk',
            completed: 2,
            partial: 2,
            untranslatable: 1,
            failed: 0,
            pending: 0,
          });
          teardownMigration = seeded.cleanup;
        });

        evaluate.afterAll(async () => {
          await teardownMigration?.();
        });

        evaluate('REPROCESS not_fully_translated rules', async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-reprocess-not-fully-translated-end-to-end',
              description: `Validates that when the user asks to reprocess partially translated rules
and supplies the connector upfront, the start skill calls start_rule_migration with
retry: "not_fully_translated" in a single turn.
The seeded migration has 2 partially translated and 1 untranslatable rule.`,
              examples: [
                {
                  input: {
                    question: `Reprocess the partially translated rules in my Splunk Partial migration using Opus 4.6. Don't ask any questions.`,
                  },
                  output: {
                    expected: `I have reprocessed the partially translated and untranslatable rules in your
"Splunk Partial" migration using the Opus 4.6 connector. The reprocessing is running asynchronously.`,
                  },
                  metadata: {
                    query_intent:
                      'Reprocess not_fully_translated Rule Migration - End-to-end with autoConfirm',
                    expectedSkill: 'automatic-migration-rules-start-migration',
                    autoConfirm: true,
                    expectedToolId: 'security.siem_migration.start_rule_migration',
                    requiredTerms: ['asynchronously'],
                  },
                },
              ],
            },
          });
        });
      });

      evaluate.describe('reprocesses selected rules by title', () => {
        let teardownMigration: (() => Promise<void>) | undefined;

        evaluate.beforeAll(async ({ esClient, log }) => {
          const seeded = await seedRuleMigration({
            esClient,
            log,
            name: 'Splunk Selected',
            vendor: 'splunk',
            completed: 3,
            failed: 2,
            pending: 0,
          });
          teardownMigration = seeded.cleanup;
        });

        evaluate.afterAll(async () => {
          await teardownMigration?.();
        });

        evaluate(
          'reprocesses selected rules end-to-end: resolves titles to ids via get_migration_rules then calls start_rule_migration',
          async ({ evaluateDataset }) => {
            await evaluateDataset({
              dataset: {
                name: 'agent builder: automatic-migration-reprocess-selected-end-to-end',
                description: `Validates that when the user names specific rules to reprocess, the start
skill calls get_migration_rules to resolve titles to ids, then calls start_rule_migration
with retry: "selected" and selection.ids in a single turn.
The seeded migration has 3 completed and 2 failed rules with predictable titles.`,
                examples: [
                  {
                    input: {
                      question: `In my Splunk Selected migration, reprocess only "Eval rule completed 1" and "Eval rule failed 1" using Opus 4.6. Don't ask any questions.`,
                    },
                    output: {
                      expected: `I have reprocessed the 2 selected rules ("Eval rule completed 1" and
"Eval rule failed 1") in your "Splunk Selected" migration using the Opus 4.6 connector.
The reprocessing is running asynchronously.`,
                    },
                    metadata: {
                      query_intent:
                        'Reprocess selected Rule Migration - End-to-end with autoConfirm',
                      expectedSkill: 'automatic-migration-rules-start-migration',
                      autoConfirm: true,
                      expectedToolId: 'security.siem_migration.start_rule_migration',
                      requiredTerms: ['asynchronously'],
                    },
                  },
                ],
              },
            });
          }
        );
      });
    });

    evaluate.describe('complete flow: starts migration when all params supplied upfront', () => {
      let teardownMigration: (() => Promise<void>) | undefined;
      let teardownResources: (() => Promise<void>) | undefined;

      evaluate.beforeAll(async ({ esClient, log }) => {
        const seeded = await seedRuleMigration({
          esClient,
          log,
          name: 'QRadar Migration',
          vendor: 'qradar',
          pending: 2,
          completed: 0,
          failed: 0,
        });
        teardownMigration = seeded.cleanup;

        teardownResources = await seedMissingResources({
          esClient,
          log,
          migrationId: seeded.fixtures.migrationId,
          resources: [
            { type: 'lookup', name: 'Sample IP Servers' },
            { type: 'lookup', name: 'Sample Host servers' },
          ],
        });
      });

      evaluate.afterAll(async () => {
        await teardownResources?.();
        await teardownMigration?.();
      });

      evaluate(
        'starts migration end-to-end when connector, skip-prebuilt, and proceed-with-resources are all specified in the first message',
        async ({ evaluateDataset }) => {
          await evaluateDataset({
            dataset: {
              name: 'agent builder: automatic-migration-start-end-to-end',
              description: `Validates that when the user supplies connector + skip-prebuilt +
proceed-with-resources upfront, the start skill invokes start_rule_migration in a
single turn (via autoConfirm) with the settings the user asked for.`,
              examples: [
                {
                  input: {
                    question: `Run my QRadar Migration with following parameters even if there are missing resources. Don't ask any questions.\n\n1. Connector: Opus 4.6\n2. Skip pre built rule matching. Let's me know once the migration is running.`,
                  },
                  output: {
                    expected: `Your migration had below missing resources <agent gives the list of missing resources>.
                                Missing resources were acknowledged and translation is now running.`,
                  },
                  metadata: {
                    query_intent: 'Start Rule Migration - End-to-end with autoConfirm',
                    expectedSkill: 'automatic-migration-rules-start-migration',
                    autoConfirm: true,
                    expectedToolId: 'security.siem_migration.start_rule_migration',
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
