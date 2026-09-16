/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate } from './evaluate_setup';

evaluate.describe(
  'Alert Triage - routing boundary',
  { tag: [...tags.serverless.security.complete, ...tags.serverless.security.ease] },
  () => {
    evaluate(
      'single-alert investigation routes to alert-analysis, not alert-triage',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder: security-alert-triage-routing-boundary',
            description:
              'Validates that single-alert investigation queries route to alert-analysis, not alert-triage (negative test)',
            examples: [
              {
                input: {
                  question:
                    'Help me triage alert abc-123. Is it a true positive or false positive?',
                },
                output: {
                  expected:
                    'Uses alert-analysis (not alert-triage queue prioritization) to investigate alert ' +
                    'abc-123. Fetches alert details, related alerts, threat intelligence, and entity risk ' +
                    'to assess true positive vs false positive disposition. Does not rank the full alert ' +
                    'queue or present multi-group alert-triage output.',
                },
                metadata: {
                  query_intent: 'Single Alert Investigation',
                  shouldNotActivateSkill: 'alert-triage',
                  expectedSkill: 'alert-analysis',
                },
              },
            ],
          },
        });
      }
    );
  }
);
