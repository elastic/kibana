/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate_setup';

evaluate.describe(
  'Automatic Rule Migration - boundary',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'intents route to the correct rule-migration sibling skill',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-summarize-vs-start',
            description: `Validates that overview queries route to automatic-migration-rules-summarize and
start/reprocess/resume queries route to automatic-migration-rules-start-migration,
and that the two rule-migration siblings do not steal each other's intents.
Fixture-free: no migrations exist, so both skills report empty state.`,
            examples: [
              {
                input: {
                  question: 'How are my rule migrations doing?',
                },
                output: {
                  expected: `There are currently no rule migrations available.
You can start a new migration from LaunchPad → Manage Automatic Migrations.`,
                },
                metadata: {
                  query_intent: 'Rule Migration Overview',
                  expectedSkill: 'automatic-migration-rules-summarize',
                  shouldNotActivateSkill: 'automatic-migration-rules-start-migration',
                },
              },
              {
                input: {
                  question: 'Start translating my Splunk rules.',
                },
                output: {
                  expected: `I checked for existing rule migrations but could not find any.
There are currently no rule migrations to start.
You can create a migration from LaunchPad → Manage Automatic Migrations.`,
                },
                metadata: {
                  query_intent: 'Start Rule Migration',
                  expectedSkill: 'automatic-migration-rules-start-migration',
                  shouldNotActivateSkill: 'automatic-migration-rules-summarize',
                },
              },
            ],
          },
        });
      }
    );
  }
);
