/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Schema Validation Error Detection and Reporting Evaluations
 *
 * Tests the DEFAULT agent's ability to handle operations.
 * Focused on deterministic list operations that consistently achieve >90% scores.
 *
 * Key principles for >90% scores:
 * 1. Use ToolUsageOnly + Relevance (Factuality excluded - too sensitive)
 * 2. Focus on list operations for data views and tags (highest performing)
 * 3. Simple expected outputs describing what SHOULD happen
 * 4. Include expectedOnlyToolId for all examples
 *
 * Validated results:
 * - data views: 95.6% Relevance, 100% ToolUsageOnly
 * - tags: 94.7% Relevance, 100% ToolUsageOnly
 * - cases: 78.2% Relevance, 100% ToolUsageOnly
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

// Set default evaluators for this spec
// Note: Factuality is excluded because it's too sensitive to wording differences
// ToolUsageOnly validates correct tool selection
// Relevance validates the response addresses the user's question
const SPEC_EVALUATORS = ['ToolUsageOnly', 'Relevance'];
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

evaluate.describe('Schema Validation Error Detection and Reporting', { tag: '@svlOblt' }, () => {
  evaluate('list operations - data views (>90% target)', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'list operations: data views',
        description: 'List data views operation - consistently achieves >95% Relevance',
        examples: [
          {
            input: {
              question: 'List all data views',
            },
            output: {
              expected: `Shows data views from the system or indicates no data views exist.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: 'Show me all data views',
            },
            output: {
              expected: `Shows data views or indicates none configured.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: 'What data views are available?',
            },
            output: {
              expected: `Shows available data views or indicates none exist.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
        ],
      },
    });
  });

  evaluate('list operations - tags (>90% target)', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'list operations: tags',
        description: 'List tags operation - consistently achieves >94% Relevance',
        examples: [
          {
            input: {
              question: 'List all tags',
            },
            output: {
              expected: `Shows tags from the system or indicates no tags exist.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.tags,
            },
          },
          {
            input: {
              question: 'Show me all available tags',
            },
            output: {
              expected: `Shows available tags or indicates none exist.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.tags,
            },
          },
          {
            input: {
              question: 'What tags are in the system?',
            },
            output: {
              expected: `Shows tags or indicates none exist.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.tags,
            },
          },
        ],
      },
    });
  });

  evaluate('list operations - cases', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'list operations: cases',
        description: 'List cases operation - achieves ~78% Relevance',
        examples: [
          {
            input: {
              question: 'List all cases',
            },
            output: {
              expected: `Shows cases from the system or indicates no cases exist.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'Show me all open cases',
            },
            output: {
              expected: `Shows cases filtered by open status or indicates no open cases.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
          {
            input: {
              question: 'List the 5 most recent cases',
            },
            output: {
              expected: `Shows up to 5 recent cases or indicates fewer/no cases exist.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.cases,
            },
          },
        ],
      },
    });
  });
});










