/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform Generate ES|QL Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the generate_esql tool.
 * Uses the default agent (elastic-ai-agent) to test the real user experience.
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

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

evaluate.describe('Platform Generate ES|QL Skill', { tag: '@svlOblt' }, () => {
  // Using the default agent (elastic-ai-agent) to test the real user experience
  // No custom agent creation needed - the default agent already has ES|QL generation tools

  evaluate('basic ES|QL generation', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform generate esql: basic queries',
        description: 'Evaluation scenarios for basic ES|QL query generation',
        examples: [
          {
            input: {
              question: 'Use the ES|QL generation tool to create a query that counts all documents in logs-* index',
            },
            output: {
              expected: `An ES|QL query that uses FROM logs-* and includes a COUNT aggregation.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
          {
            input: {
              question: 'Generate an ES|QL query to get the latest 10 error logs from logs-*',
            },
            output: {
              expected: `An ES|QL query with error filtering (WHERE clause), sorting (SORT), and LIMIT 10.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
          {
            input: {
              question:
                'Use the generate_esql tool to create a query showing unique hosts from metrics-* in the last 24 hours',
            },
            output: {
              expected: `An ES|QL query with time filtering and host field aggregation or distinct values.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
        ],
      },
    });
  });

  evaluate('aggregation queries', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform generate esql: aggregations',
        description: 'Evaluation scenarios for ES|QL aggregation query generation',
        examples: [
          {
            input: {
              question:
                'Use ES|QL generation to create a query calculating average response time by service name from apm-*',
            },
            output: {
              expected: `An ES|QL query with AVG() function and STATS ... BY service.name grouping.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
          {
            input: {
              question:
                'Generate an ES|QL query to find the top 5 users with most failed login attempts this week from security-*',
            },
            output: {
              expected: `An ES|QL query with time filter, failure event filter, COUNT by user, and LIMIT 5.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
          {
            input: {
              question: 'Use the generate_esql tool to create a query showing request count by HTTP method from logs-*',
            },
            output: {
              expected: `An ES|QL query with STATS COUNT BY http.request.method or similar grouping.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
        ],
      },
    });
  });

  evaluate('time-based queries', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform generate esql: time-based',
        description: 'Evaluation scenarios for time-based ES|QL query generation',
        examples: [
          {
            input: {
              question: 'Use generate_esql to create a query showing error count per hour for the last 24 hours from logs-*',
            },
            output: {
              expected: `An ES|QL query with time filtering, date/time bucketing, and COUNT aggregation.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
          {
            input: {
              question:
                'Generate an ES|QL query to show daily active users trend for the last 30 days from users-*',
            },
            output: {
              expected: `An ES|QL query with 30-day time filter, daily buckets, and COUNT_DISTINCT for users.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
        ],
      },
    });
  });

  evaluate('field transformation queries', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform generate esql: field transformations',
        description: 'Evaluation scenarios for ES|QL queries with field transformations',
        examples: [
          {
            input: {
              question:
                'Use generate_esql to create a query that converts bytes to megabytes and shows top 10 largest transfers from logs-*',
            },
            output: {
              expected: `An ES|QL query with EVAL for bytes conversion, SORT DESC, and LIMIT 10.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
          {
            input: {
              question:
                'Generate an ES|QL query to categorize response times as fast/medium/slow and count each from apm-*',
            },
            output: {
              expected: `An ES|QL query with CASE or conditional logic for categorization and COUNT aggregation.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
        ],
      },
    });
  });

  evaluate('complex filtering queries', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform generate esql: complex filtering',
        description: 'Evaluation scenarios for ES|QL queries with complex filter conditions',
        examples: [
          {
            input: {
              question:
                'Use generate_esql to create a query finding requests from internal IPs (192.168.x.x or 10.x.x.x) that failed from network-*',
            },
            output: {
              expected: `An ES|QL query with IP filtering (CIDR_MATCH or LIKE) and failure condition.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
          {
            input: {
              question:
                'Generate an ES|QL query to find log entries containing "error" or "exception" but not "expected" from logs-*',
            },
            output: {
              expected: `An ES|QL query with LIKE patterns for matching and NOT condition for exclusion.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.generateEsql,
            },
          },
        ],
      },
    });
  });

  evaluate('edge cases and clarification', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform generate esql: edge cases',
        description: 'Evaluation scenarios for handling edge cases and ambiguous requests',
        examples: [
          {
            input: {
              question: 'Generate an ES|QL query',
            },
            output: {
              expected: `Request for clarification about what data to query, index pattern, and what to find/analyze.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Write an ES|QL query to delete old logs from logs-*',
            },
            output: {
              expected: `Explanation that ES|QL is for querying only and cannot delete data. Suggestion to use ILM or Delete by Query API.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });
});
