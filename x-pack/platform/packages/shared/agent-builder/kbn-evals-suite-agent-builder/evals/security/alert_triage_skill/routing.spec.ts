/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate_setup';

evaluate.describe(
  'Alert Triage - routing',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'queue prioritization queries activate alert-triage skill and tool',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-alert-triage-skill',
            description:
              'Validates that alert queue prioritization queries activate the alert-triage skill and use the alert-triage tool',
            examples: [
              {
                input: {
                  question: 'What should I focus on right now?',
                },
                output: {
                  expected:
                    'Presents ranked alert groups from the alert-triage tool. Each group shows the shared ' +
                    'entity or context, group score with drivers (base risk score, MITRE tactic boost, ' +
                    'and optional entity risk or asset criticality boosts), and the top alert _id. ' +
                    'Summarizes how many alerts were assessed and recommends alert-analysis for top groups. ' +
                    'Presentation order of details within a group does not affect correctness.',
                },
                metadata: {
                  query_intent: 'Alert Queue Triage',
                  expectedSkill: 'alert-triage',
                },
              },
              {
                input: {
                  question:
                    'Which alerts from the last 8 hours are most urgent? Give me a prioritized view.',
                },
                output: {
                  expected:
                    'Presents ranked alert groups from the last 8 hours via the alert-triage tool. Each group ' +
                    'shows shared host or user entity, score drivers (base risk, MITRE boost, optional ' +
                    'entity risk or asset criticality), and top alert _id. Highest-urgency groups appear ' +
                    'first. Presentation order of details within a group does not affect correctness.',
                },
                metadata: {
                  query_intent: 'Alert Queue Triage',
                  expectedSkill: 'alert-triage',
                  expectedOnlyToolId: 'security.alert-triage',
                },
              },
              {
                input: {
                  question:
                    'What alerts should I look at to start my shift? I want to know where to begin.',
                },
                output: {
                  expected:
                    'Presents ranked open alert groups as a shift starting point via the alert-triage tool. ' +
                    'Each group shows shared entity, score drivers, and top alert _id. Summarizes total ' +
                    'alerts assessed. Presentation order of details within a group does not affect correctness.',
                },
                metadata: {
                  query_intent: 'Alert Queue Triage',
                  expectedSkill: 'alert-triage',
                },
              },
              {
                input: {
                  question:
                    'I have a large alert queue. Which of these are the highest priority to investigate?',
                },
                output: {
                  expected:
                    'Presents highest-priority alert groups first, ranked by composite score (base risk, ' +
                    'MITRE tactic boost, entity clustering). Each group includes shared entity, score ' +
                    'drivers, and top alert _id. Presentation order of details within a group does not ' +
                    'affect correctness.',
                },
                metadata: {
                  query_intent: 'Alert Queue Triage',
                  expectedSkill: 'alert-triage',
                },
              },
            ],
          },
        });
      }
    );
  }
);
