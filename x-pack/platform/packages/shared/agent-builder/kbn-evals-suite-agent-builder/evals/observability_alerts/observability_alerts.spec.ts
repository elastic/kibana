/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Observability Alerts Skill Evaluations
 *
 * Tests the agent's ability to use the observability alerts tool.
 * Uses the default agent to test the real user experience.
 *
 * This skill lists and triages observability alerts.
 * It is read-only.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

// The skill namespace - this skill uses observability.get_alerts tool
const observabilityAlertsSkillId = 'observability.alerts';

// Set default evaluators for this spec
const SPEC_EVALUATORS = ['ToolUsageOnly', 'Groundedness', 'Relevance', 'Sequence Accuracy'];
if (!process.env.SELECTED_EVALUATORS) {
  process.env.SELECTED_EVALUATORS = SPEC_EVALUATORS.join(',');
}

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, phoenixClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          phoenixClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('Observability Alerts Skill', { tag: '@svlOblt' }, () => {
  evaluate('list alerts', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'observability alerts: list operations',
        description: 'Evaluation scenarios for listing observability alerts',
        examples: [
          {
            input: {
              question: 'Use the observability alerts tool to check what alerts are currently firing.',
            },
            output: {
              expected: `Alert count or list from tool results. If no alerts: clear indication that none are firing.`,
            },
            metadata: {
              expectedOnlyToolId: observabilityAlertsSkillId,
            },
          },
          {
            input: {
              question: 'Use observability alerts to list all current alerts.',
            },
            output: {
              expected: `Alert names and details from tool results, or indication that no alerts exist.`,
            },
            metadata: {
              expectedOnlyToolId: observabilityAlertsSkillId,
            },
          },
          {
            input: {
              question: 'Use the observability alerts tool to check if there are any alerts.',
            },
            output: {
              expected: `Yes with alert count/names, or no alerts found.`,
            },
            metadata: {
              expectedOnlyToolId: observabilityAlertsSkillId,
            },
          },
        ],
      },
    });
  });
});
