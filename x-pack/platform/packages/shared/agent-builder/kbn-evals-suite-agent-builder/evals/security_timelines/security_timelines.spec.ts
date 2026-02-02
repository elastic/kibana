/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Security Timelines Skill Evaluations
 *
 * Tests the agent's ability to use the security timelines tool.
 * Uses the default agent to test the real user experience.
 *
 * Supported operations:
 * - find: Search timelines (read-only)
 * - get: Get a specific timeline by ID (read-only)
 * - create: Create new timelines (requires confirm: true)
 * - update: Update timelines (requires confirm: true)
 *
 * NOTE: Write operations require confirmation.
 * These tests focus on read-only operations.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

// The skill namespace from the skill definition
const securityTimelinesSkillId = 'security.timelines';

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

evaluate.describe('Security Timelines Skill', { tag: '@svlOblt' }, () => {
  evaluate('find timelines', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'security timelines: find operations',
        description: 'Evaluation scenarios for finding timelines',
        examples: [
          {
            input: {
              question: 'List all security timelines',
            },
            output: {
              expected: `Timeline names and IDs, or indication that no timelines exist.`,
            },
            metadata: {
              expectedOnlyToolId: securityTimelinesSkillId,
            },
          },
          {
            input: {
              question: 'Show me the most recent security timelines',
            },
            output: {
              expected: `Recent timelines with names/IDs, or indication that no timelines found.`,
            },
            metadata: {
              expectedOnlyToolId: securityTimelinesSkillId,
            },
          },
        ],
      },
    });
  });
});
