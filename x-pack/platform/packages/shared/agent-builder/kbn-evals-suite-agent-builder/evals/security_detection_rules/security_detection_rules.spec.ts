/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Security Detection Rules Skill Evaluations
 *
 * Tests the agent's ability to use the security detection rules tool.
 * Uses the default agent to test the real user experience.
 *
 * Supported operations:
 * - find: Search detection rules (read-only)
 * - get: Get a specific rule by ID (read-only)
 * - set_enabled: Enable/disable rules (requires confirm: true)
 * - create: Create new rules (requires confirm: true)
 *
 * NOTE: Write operations (set_enabled, create) require confirmation.
 * These tests focus on read-only operations.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

// The skill namespace from the skill definition
const securityDetectionRulesSkillId = 'security.detection_rules';

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

evaluate.describe('Security Detection Rules Skill', { tag: '@svlOblt' }, () => {
  evaluate('find detection rules', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'security detection rules: find operations',
        description: 'Evaluation scenarios for finding detection rules',
        examples: [
          {
            input: {
              question: 'List all security detection rules',
            },
            output: {
              expected: `A count of detection rules and their names/IDs, or indication that no rules exist.`,
            },
            metadata: {
              expectedOnlyToolId: securityDetectionRulesSkillId,
            },
          },
          {
            input: {
              question: 'Find detection rules related to Windows',
            },
            output: {
              expected: `Windows-related detection rules with names/IDs, or indication that none found.`,
            },
            metadata: {
              expectedOnlyToolId: securityDetectionRulesSkillId,
            },
          },
        ],
      },
    });
  });

  evaluate('search detection rules by criteria', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'security detection rules: search criteria',
        description: 'Evaluation scenarios for searching rules by specific criteria',
        examples: [
          {
            input: {
              question: 'Find all high severity detection rules',
            },
            output: {
              expected: `High severity detection rules with names/IDs, or indication that none found.`,
            },
            metadata: {
              expectedOnlyToolId: securityDetectionRulesSkillId,
            },
          },
        ],
      },
    });
  });
});
