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
  'Automatic Rule Migration - update translated rule skill',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    let teardown: (() => Promise<void>) | undefined;

    evaluate.beforeAll(async ({ esClient, log }) => {
      // 16 partially translated rules (8 of them missing an index pattern): more candidates than
      // the skill shows at once, so the user has to define the scope.
      const seeded = await seedRuleMigration({
        esClient,
        log,
        name: 'Splunk Migration',
        completed: 2,
        partial: 8,
        missingIndex: 8,
        failed: 0,
      });
      teardown = seeded.cleanup;
    });

    evaluate.afterAll(async () => {
      await teardown?.();
    });

    evaluate(
      'index pattern and rule fix requests list a page of candidates and let the user choose',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-update-translated-rule',
            description: `Validates that missing / wrong index pattern requests route to the
automatic-migration-rules-update-translated-rule skill, and that requests without a specific rule
list a bounded page of candidates with the total, ask the user which rule to fix, and do not update
anything yet.`,
            examples: [
              {
                input: {
                  question:
                    'Find the missing index patterns for the rules present in Splunk Migration',
                },
                output: {
                  expected: `8 rules in "Splunk Migration" are missing an index pattern. Showing 5 of 8 rules not yet installed:
the first five "Eval rule missing index" rules. Asks which rule to fix, or offers to narrow the
search or show the next 5.`,
                },
                metadata: {
                  query_intent: 'Find rules missing an index pattern',
                  expectedSkill: 'automatic-migration-rules-update-translated-rule',
                  expectedToolId: 'security.siem_migration.get_migration_rules',
                  shouldNotCallToolId: 'security.siem_migration.update_translated_rule',
                },
              },
              {
                input: {
                  question: 'Fix the wrong index pattern of a translated rule in Splunk Migration',
                },
                output: {
                  expected: `Showing 5 of 8 rules not yet installed in "Splunk Migration" that are missing an index pattern,
states the total, and asks which rule to fix.`,
                },
                metadata: {
                  query_intent: 'Fix a wrong index pattern',
                  expectedSkill: 'automatic-migration-rules-update-translated-rule',
                  expectedToolId: 'security.siem_migration.get_migration_rules',
                  shouldNotCallToolId: 'security.siem_migration.update_translated_rule',
                },
              },
              {
                input: {
                  question:
                    'Update the ES|QL query of a partially translated rule in Splunk Migration',
                },
                output: {
                  expected: `Showing 5 of 16 partially translated rules not yet installed in "Splunk Migration".
Asks which rule to update, or offers to narrow the search or show the next 5. Does not claim the
list is complete.`,
                },
                metadata: {
                  query_intent: 'Update a translated rule without naming it',
                  expectedSkill: 'automatic-migration-rules-update-translated-rule',
                  expectedToolId: 'security.siem_migration.get_migration_rules',
                  shouldNotCallToolId: 'security.siem_migration.update_translated_rule',
                },
              },
            ],
          },
        });
      }
    );
  }
);
