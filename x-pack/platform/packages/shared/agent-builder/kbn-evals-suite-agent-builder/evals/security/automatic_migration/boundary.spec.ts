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
      'overview vs start intents route to the correct rule-migration sibling skill',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-summarize-vs-start',
            description:
              'Validates that overview queries route to automatic-migration-rules-get-all-stats and ' +
              'start/reprocess/resume queries route to automatic-migration-rules-start-migration, and that the ' +
              'two rule-migration siblings do not steal each other intents.',
            examples: [
              {
                input: {
                  question: 'How are my rule migrations doing?',
                },
                output: {
                  expected:
                    'I will summarize rule migration progress by calling ' +
                    'get_all_rule_migration_stats. This is an overview, not a start/reprocess action.',
                },
                metadata: {
                  query_intent: 'Rule Migration Overview',
                  expectedSkill: 'automatic-migration-rules-get-all-stats',
                  shouldNotActivateSkill: 'automatic-migration-rules-start-migration',
                },
              },
              {
                input: {
                  question: 'Start translating my Splunk rules.',
                },
                output: {
                  expected:
                    'I will activate the automatic-migration-rules-start-migration skill to start translating ' +
                    'the Splunk rules, asking for a connector and confirmation first.',
                },
                metadata: {
                  query_intent: 'Start Rule Migration',
                  expectedSkill: 'automatic-migration-rules-start-migration',
                  shouldNotActivateSkill: 'automatic-migration-rules-get-all-stats',
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'dashboard-migration intents do NOT activate the rule-migration skills',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-rule-vs-dashboard',
            description:
              'Automatic Migration covers both rules and dashboards as distinct features. The ' +
              'PR1 skills handle RULE migrations only. Validates that dashboard-migration intents ' +
              'do NOT activate automatic-migration-rules-get-all-stats or automatic-migration-rules-start-migration, and ' +
              'includes a positive control so the dashboard-negative assertions are not just ' +
              '"nothing activates".',
            examples: [
              {
                input: {
                  question: 'Migrate my Splunk dashboards to Kibana.',
                },
                output: {
                  expected:
                    'Dashboard migration is a separate Automatic Migration feature not handled ' +
                    'by the rule-migration skills. I will not start or summarize a rule migration ' +
                    'for this request.',
                },
                metadata: {
                  query_intent: 'Dashboard Migration',
                  shouldNotActivateSkills: [
                    'automatic-migration-rules-get-all-stats',
                    'automatic-migration-rules-start-migration',
                  ],
                },
              },
              {
                input: {
                  question: 'Show me the translation progress for my Splunk dashboard migration.',
                },
                output: {
                  expected:
                    'Dashboard migration progress is not available through the rule-migration ' +
                    'summarize skill. I will not activate automatic-migration-rules-get-all-stats for a ' +
                    'dashboard migration.',
                },
                metadata: {
                  query_intent: 'Dashboard Migration',
                  shouldNotActivateSkill: 'automatic-migration-rules-get-all-stats',
                },
              },
              {
                input: {
                  question: 'Start translating my QRadar dashboards.',
                },
                output: {
                  expected:
                    'Dashboard translation is a separate Automatic Migration feature. I will ' +
                    'not activate the rule-migration start skill for a dashboard migration.',
                },
                metadata: {
                  query_intent: 'Dashboard Migration',
                  shouldNotActivateSkill: 'automatic-migration-rules-start-migration',
                },
              },
              {
                input: {
                  question: 'Start translating my Splunk rules.',
                },
                output: {
                  expected:
                    'I will activate the automatic-migration-rules-start-migration skill to start translating ' +
                    'the Splunk rules, asking for a connector and confirmation first.',
                },
                metadata: {
                  query_intent: 'Start Rule Migration (positive control)',
                  expectedSkill: 'automatic-migration-rules-start-migration',
                },
              },
            ],
          },
        });
      }
    );

    evaluate(
      'out-of-scope mutating intents and non-migration distractors do not activate the rule-migration skills',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: automatic-migration-distractors',
            description:
              'Validates that install/delete intents (future sibling skills, not in PR1) and ' +
              'non-migration distractors do not activate the two PR1 rule-migration skills.',
            examples: [
              {
                input: {
                  question: 'Install the translated rules from my Splunk Q1 rule migration.',
                },
                output: {
                  expected:
                    'Installing translated rules is handled by a separate install skill, not ' +
                    'the start skill. I will not start or reprocess the migration for an install ' +
                    'request.',
                },
                metadata: {
                  query_intent: 'Install Rules',
                  shouldNotActivateSkill: 'automatic-migration-rules-start-migration',
                },
              },
              {
                input: {
                  question: 'Delete my Splunk Q1 rule migration.',
                },
                output: {
                  expected:
                    'Deleting a migration is handled by a separate delete skill. I will not ' +
                    'activate the summarize or start rule-migration skills for a delete request.',
                },
                metadata: {
                  query_intent: 'Delete Migration',
                  shouldNotActivateSkills: [
                    'automatic-migration-rules-get-all-stats',
                    'automatic-migration-rules-start-migration',
                  ],
                },
              },
              {
                input: {
                  question: 'Show me the available dashboards in Kibana.',
                },
                output: {
                  expected:
                    'This is a platform dashboard query, not an Automatic Migration request. I ' +
                    'will not activate the rule-migration skills.',
                },
                metadata: {
                  query_intent: 'Platform Distractor',
                  shouldNotActivateSkills: [
                    'automatic-migration-rules-get-all-stats',
                    'automatic-migration-rules-start-migration',
                  ],
                },
              },
              {
                input: {
                  question: 'Create a new detection rule for failed logins.',
                },
                output: {
                  expected:
                    'This is a detection-rule authoring request, not an Automatic Migration. I ' +
                    'will not activate the rule-migration skills.',
                },
                metadata: {
                  query_intent: 'Rule Authoring Distractor',
                  shouldNotActivateSkills: [
                    'automatic-migration-rules-get-all-stats',
                    'automatic-migration-rules-start-migration',
                  ],
                },
              },
            ],
          },
        });
      }
    );
  }
);
