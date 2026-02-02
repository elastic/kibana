/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform Index Explorer Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the index explorer tools.
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

evaluate.describe('Platform Index Explorer Skill', { tag: '@svlOblt' }, () => {
  // Using the default agent (elastic-ai-agent) to test the real user experience
  // No custom agent creation needed - the default agent already has index explorer tools

  evaluate('list indices', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform index explorer: list indices',
        description: 'Evaluation scenarios for listing available indices',
        examples: [
          {
            input: {
              question: 'What indices are available in this Elasticsearch cluster?',
            },
            output: {
              expected: `Lists available indices or indicates none accessible. Uses tool results.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Show me all indices matching the pattern logs-*',
            },
            output: {
              expected: `Lists matching logs-* indices or indicates none. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.listIndices,
            },
          },
          {
            input: {
              question: 'List the 5 largest indices by document count',
            },
            output: {
              expected: `Shows top 5 indices by document count. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.listIndices,
            },
          },
          {
            input: {
              question: 'What APM-related indices exist in the cluster?',
            },
            output: {
              expected: `Shows APM indices or indicates none configured. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.listIndices,
            },
          },
        ],
      },
    });
  });

  evaluate('get index mapping', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform index explorer: mappings',
        description: 'Evaluation scenarios for exploring index mappings and field structures',
        examples: [
          {
            input: {
              question: 'What fields are available in the logs-* index pattern?',
            },
            output: {
              expected: `The response should contain:
- A list of available fields in logs-*
- Field types (keyword, text, date, long, etc.)
- Common fields like @timestamp, message, log.level`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.getIndexMapping,
            },
          },
          {
            input: {
              question: 'Show me the mapping for the host.* fields in metrics-* index',
            },
            output: {
              expected: `The response should contain:
- Host namespace fields (host.name, host.ip, host.os.*, etc.)
- Field types for each host field
- Nested structure explanation if applicable`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.getIndexMapping,
            },
          },
          {
            input: {
              question: 'What date fields exist in the security-* index?',
            },
            output: {
              expected: `The response should contain:
- Fields with type "date" (e.g., @timestamp, event.created)
- Date format information if available
- Zero results is valid if index doesn't exist`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.getIndexMapping,
            },
          },
          {
            input: {
              question: 'Explain the structure of the event field in the auditbeat-* index',
            },
            output: {
              expected: `The response should contain:
- Event object structure and subfields
- Fields like event.action, event.category, event.outcome
- Field types for each event subfield`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.getIndexMapping,
            },
          },
        ],
      },
    });
  });

  evaluate('comprehensive index exploration', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform index explorer: comprehensive',
        description: 'Evaluation scenarios for comprehensive index exploration using list_indices',
        examples: [
          {
            input: {
              question:
                'Use the list indices tool with pattern logs-* to find log-related indices.',
            },
            output: {
              expected: `Uses list_indices tool. Shows logs-* indices or indicates none found.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.listIndices,
            },
          },
          {
            input: {
              question:
                'Use the list indices tool to find indices matching apm-* or metrics-apm.*',
            },
            output: {
              expected: `Uses list_indices tool. Shows APM-related indices or indicates none found.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.listIndices,
            },
          },
          {
            input: {
              question:
                'Use the list indices tool with pattern security-* to find security indices.',
            },
            output: {
              expected: `Uses list_indices tool. Shows security indices or indicates none found.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.listIndices,
            },
          },
          {
            input: {
              question:
                'Use the list indices tool to find indices matching metrics-*',
            },
            output: {
              expected: `Uses list_indices tool. Shows metrics indices or indicates none found.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.listIndices,
            },
          },
        ],
      },
    });
  });

  evaluate('field type discovery', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform index explorer: field types',
        description: 'Evaluation scenarios for discovering specific field types',
        examples: [
          {
            input: {
              question:
                'Call the get_index_mapping tool with indices ["logs-*"] to retrieve the field mappings.',
            },
            output: {
              expected: `Calls get_index_mapping tool. Shows field mappings or indicates index not found.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.getIndexMapping,
            },
          },
          {
            input: {
              question:
                'Call the get_index_mapping tool with indices [".kibana*"] to retrieve the field mappings.',
            },
            output: {
              expected: `Calls get_index_mapping tool. Shows .kibana mappings or indicates index not found.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.getIndexMapping,
            },
          },
          {
            input: {
              question:
                'Call the get_index_mapping tool with indices ["metrics-*"] to retrieve the field mappings.',
            },
            output: {
              expected: `Calls get_index_mapping tool. Shows metrics field mappings or indicates index not found.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.getIndexMapping,
            },
          },
          {
            input: {
              question:
                'Call the get_index_mapping tool with indices ["*"] to retrieve the field mappings for all indices.',
            },
            output: {
              expected: `Calls get_index_mapping tool. Shows field mappings or indicates none accessible.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.getIndexMapping,
            },
          },
        ],
      },
    });
  });

  evaluate('data discovery for querying', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform index explorer: query preparation',
        description: 'Evaluation scenarios for discovering data to prepare queries',
        examples: [
          {
            input: {
              question:
                'I want to search for errors. What field should I use to filter by log level?',
            },
            output: {
              expected: `The response should contain:
- The log level field name (log.level or similar)
- Possible values (error, warn, info, debug)
- Example filter syntax or guidance`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'What fields can I group by for a breakdown of web traffic?',
            },
            output: {
              expected: `The response should contain:
- Recommended breakdown fields (url.path, http.request.method)
- User agent fields (user_agent.name, user_agent.os.name)
- Geographic fields (source.geo.country_name)`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Help me find the right field for user identification in security events',
            },
            output: {
              expected: `The response should contain:
- User identification fields (user.name, user.id, user.email)
- Field types and their use cases
- Which field to use for different scenarios`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'What status code field should I use for HTTP error analysis?',
            },
            output: {
              expected: `The response should contain:
- HTTP status code field (http.response.status_code)
- How to filter for errors (4xx, 5xx ranges)
- Related fields like http.response.body.bytes`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('edge cases and guidance', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform index explorer: edge cases',
        description: 'Evaluation scenarios for handling edge cases and providing guidance',
        examples: [
          {
            input: {
              question: 'Explore an index that does not exist: nonexistent-index-12345',
            },
            output: {
              expected: `The response should contain:
- An error or message indicating the index was not found
- Suggestion to check index name or list available indices
- Graceful handling without crashing`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'What indices should I use for security monitoring?',
            },
            output: {
              expected: `The response should contain:
- Common security index patterns (security-*, auditbeat-*, filebeat-*)
- Description of what each index type contains
- Guidance on which to use for different use cases`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.listIndices,
            },
          },
          {
            input: {
              question: "Why can't I find the field I'm looking for in the mapping?",
            },
            output: {
              expected: `The response should contain:
- Possible reasons (dynamic mapping, ECS naming, index refresh needed)
- Suggestions for finding the correct field
- Clarifying questions if needed`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'What is the difference between text and keyword field types?',
            },
            output: {
              expected: `The response should contain:
- Explanation that text fields are for full-text search
- Explanation that keyword fields are for exact matching and aggregations
- Examples of when to use each type`,
            },
            metadata: {},
          },
        ],
      },
    });
  });
});
