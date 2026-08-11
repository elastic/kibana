/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate_setup';

evaluate.describe(
  'Automatic Rule Migration - summarize skill',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'overview queries activate the summarize-automatic-migration skill and call get_all_rule_migration_stats',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-summarize',
            description:
              'Validates that overview/summary queries route to the summarize-automatic-migration ' +
              'skill and invoke security.siem_migration.get_all_rule_migration_stats. PR1 fixture-free: ' +
              'no migrations are seeded, so the tool returns empty and the expected text describes the ' +
              'tool-calling behavior rather than specific migration data. Queries are scoped to RULE ' +
              'migrations (Automatic Migration also covers dashboards; this skill is rule-only).',
            examples: [
              {
                input: {
                  question: 'How are my Automatic Rule Migrations doing?',
                },
                output: {
                  expected:
                    'I will list all rule migrations by calling get_all_rule_migration_stats and ' +
                    'summarize each migration status and rule counts. With no migrations present, ' +
                    'I will report that there are no rule migrations yet.',
                },
                metadata: {
                  query_intent: 'Rule Migration Overview',
                  expectedSkill: 'summarize-automatic-migration',
                  expectedOnlyToolId: 'security.siem_migration.get_all_rule_migration_stats',
                },
              },
              {
                input: {
                  question: 'Give me a summary of all my rule migrations.',
                },
                output: {
                  expected:
                    'I will call get_all_rule_migration_stats to list every rule migration and ' +
                    'present a summary of statuses and rule counts.',
                },
                metadata: {
                  query_intent: 'Rule Migration Overview',
                  expectedSkill: 'summarize-automatic-migration',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                },
              },
              {
                input: {
                  question:
                    'Show me the translation progress for my rule migration named Splunk Q1.',
                },
                output: {
                  expected:
                    'I will resolve the migration name "Splunk Q1" to its id via ' +
                    'get_all_rule_migration_stats, then fetch its task and translation stats to ' +
                    'report translation progress.',
                },
                metadata: {
                  query_intent: 'Rule Migration Drill-in',
                  expectedSkill: 'summarize-automatic-migration',
                  expectedToolId: 'security.siem_migration.get_all_rule_migration_stats',
                },
              },
            ],
          },
        });
      }
    );
  }
);
