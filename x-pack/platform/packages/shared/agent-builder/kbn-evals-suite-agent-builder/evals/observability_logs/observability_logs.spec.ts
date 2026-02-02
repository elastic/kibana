/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Observability Logs Skill Evaluations
 *
 * Tests the agent's ability to use the observability logs tool.
 * Uses the default agent to test the real user experience.
 *
 * Supported operations:
 * - get_data_sources: Discover available log data sources (read-only)
 * - run_log_rate_analysis: Run log rate analysis (read-only)
 * - get_log_categories: Get log categories/patterns (read-only)
 * - get_correlated_logs: Find correlated logs (read-only)
 *
 * This skill is read-only.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

// The skill namespace from the skill definition
const observabilityLogsSkillId = 'observability.logs';

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

evaluate.describe('Observability Logs Skill', { tag: '@svlOblt' }, () => {
  evaluate('discover data sources', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'observability logs: data source discovery',
        description: 'Evaluation scenarios for discovering log data sources',
        examples: [
          {
            input: {
              question: 'Use the observability logs tool to list available log data sources',
            },
            output: {
              expected: `Log data sources or indication that none are available.`,
            },
            metadata: {
              expectedOnlyToolId: observabilityLogsSkillId,
            },
          },
        ],
      },
    });
  });

  evaluate('log analysis', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'observability logs: analysis operations',
        description: 'Evaluation scenarios for log analysis',
        examples: [
          {
            input: {
              question: 'Use the observability logs tool to analyze log rates',
            },
            output: {
              expected: `Log rate analysis results or error message.`,
            },
            metadata: {
              expectedOnlyToolId: observabilityLogsSkillId,
            },
          },
        ],
      },
    });
  });
});
