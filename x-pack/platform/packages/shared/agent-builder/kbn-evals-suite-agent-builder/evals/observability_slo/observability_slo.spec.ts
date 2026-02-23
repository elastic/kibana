/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Observability SLO Skill Evaluations
 *
 * Tests the agent's ability to use the observability SLO tool.
 * Uses the default agent to test the real user experience.
 *
 * Supported operations:
 * - get_slos: List or get SLO summaries (read-only)
 * - get_alerts: Fetch related alert context (read-only)
 *
 * This skill is read-only.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

// The skill namespace from the skill definition
const observabilitySloSkillId = 'observability.slo_readonly';

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

evaluate.describe('Observability SLO Skill', { tag: '@svlOblt' }, () => {
  evaluate('list SLOs', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'observability slo: list operations',
        description: 'Evaluation scenarios for listing SLOs',
        examples: [
          {
            input: {
              question: 'List all SLOs in the system',
            },
            output: {
              expected: `SLO names and status, or indication that no SLOs are configured.`,
            },
            metadata: {
              expectedOnlyToolId: observabilitySloSkillId,
            },
          },
          {
            input: {
              question: 'Show me the SLO summaries',
            },
            output: {
              expected: `SLO names with status and error budget, or indication that no SLOs exist.`,
            },
            metadata: {
              expectedOnlyToolId: observabilitySloSkillId,
            },
          },
        ],
      },
    });
  });

  evaluate('SLO status and health', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'observability slo: status queries',
        description: 'Evaluation scenarios for checking SLO status',
        examples: [
          {
            input: {
              question: 'Which SLOs are breaching their targets?',
            },
            output: {
              expected: `SLOs breaching targets, or indication that all SLOs are healthy.`,
            },
            metadata: {
              expectedOnlyToolId: observabilitySloSkillId,
            },
          },
        ],
      },
    });
  });
});
