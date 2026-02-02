/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Osquery Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the osquery tool.
 * Uses the default agent (elastic-ai-agent) to test the real user experience.
 *
 * IMPORTANT: This skill supports multiple operations:
 * - get_status: Check osquery integration status
 * - get_schema: Browse table/column schemas
 * - list_packs / get_pack: Manage query packs
 * - list_saved_queries / get_saved_query: Manage saved queries
 * - run_live_query: Execute queries (requires confirm: true)
 * - get_live_query_results / get_action_results: Fetch results
 *
 * NOTE: The osquery skill REQUIRES the osquery plugin to be enabled.
 * Tests will fail if osquery is not properly configured.
 */

import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

// The osquery skill namespace from osquery_skill.ts
const osqueryToolId = 'osquery.entrypoint';

// Set default evaluators for this spec
// Focus on tool usage, grounding, and relevance - skip Factuality which requires exact content matching
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

evaluate.describe('Osquery Skill', { tag: '@svlOblt' }, () => {
  // Using the default agent (elastic-ai-agent) to test the real user experience
  // The osquery skill must be registered for these tests to work

  evaluate('schema discovery', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'osquery: schema discovery',
        description: 'Evaluation scenarios for discovering osquery table schemas',
        examples: [
          {
            input: {
              question: 'Use osquery to get the schema and list all available table names.',
            },
            output: {
              expected: `A list of osquery table names from the schema.`,
            },
            metadata: {
              expectedOnlyToolId: osqueryToolId,
            },
          },
          {
            input: {
              question: 'Use osquery to get the schema for the processes table and show its columns.',
            },
            output: {
              expected: `Column names and types for the processes table from osquery.`,
            },
            metadata: {
              expectedOnlyToolId: osqueryToolId,
            },
          },
        ],
      },
    });
  });

  evaluate('osquery status', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'osquery: status check',
        description: 'Evaluation scenarios for checking osquery integration status',
        examples: [
          {
            input: {
              question: 'Check the osquery status and tell me if it is installed.',
            },
            output: {
              expected: `Osquery install status indicating whether it is installed.`,
            },
            metadata: {
              expectedOnlyToolId: osqueryToolId,
            },
          },
        ],
      },
    });
  });

  evaluate('saved queries', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'osquery: saved queries',
        description: 'Evaluation scenarios for listing and viewing saved queries',
        examples: [
          {
            input: {
              question: 'What saved osquery queries exist?',
            },
            output: {
              expected: `List of saved osquery query names, or indication that none exist.`,
            },
            metadata: {
              expectedOnlyToolId: osqueryToolId,
            },
          },
        ],
      },
    });
  });

  evaluate('query packs', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'osquery: query packs',
        description: 'Evaluation scenarios for listing and viewing query packs',
        examples: [
          {
            input: {
              question: 'Use osquery to list all configured packs.',
            },
            output: {
              expected: `List of osquery packs or indication that no packs are configured.`,
            },
            metadata: {
              expectedOnlyToolId: osqueryToolId,
            },
          },
        ],
      },
    });
  });

});
