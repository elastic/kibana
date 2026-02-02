/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform Connectors Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the connectors tool.
 * Uses the default agent (elastic-ai-agent) to test the real user experience.
 *
 * IMPORTANT: This skill ONLY supports list and get operations (read-only).
 * Do NOT add tests for:
 * - Creating/deleting/updating connectors (not supported)
 * - Informational questions about connector types (leads to hallucinations)
 * - Guidance questions (skill has no knowledge base for this)
 */

import { platformCoreTools } from '@kbn/agent-builder-common';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';

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

evaluate.describe('Platform Connectors Skill', { tag: '@svlOblt' }, () => {
  // Using the default agent (elastic-ai-agent) to test the real user experience
  // No custom agent creation needed - the default agent already has connectors tools

  evaluate('list connectors', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform connectors: list operations',
        description: 'Evaluation scenarios for listing available connectors',
        examples: [
          {
            input: {
              question: 'What connectors are configured in this Kibana instance?',
            },
            output: {
              expected: `The response should contain either:
- A count of connectors and a list/table showing their names, IDs, and types
- OR a clear statement that no connectors are found
The response should NOT include explanations of what connectors are or how to create them.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.connectors,
            },
          },
          {
            input: {
              question: 'Show me all Slack connectors',
            },
            output: {
              expected: `The response should contain either:
- A list of Slack connectors with their names and IDs
- OR a statement that no Slack connectors exist
The response should NOT include setup instructions or explanations.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.connectors,
            },
          },
          {
            input: {
              question: 'List all email connectors available',
            },
            output: {
              expected: `The response should contain either:
- A list of email connectors with their names, IDs, and configuration
- OR a statement that no email connectors are configured
The response should NOT include setup instructions.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.connectors,
            },
          },
        ],
      },
    });
  });

  evaluate('get connector details', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform connectors: get details',
        description: 'Evaluation scenarios for retrieving specific connector information',
        examples: [
          {
            input: {
              question: 'Get details for connector with ID my-slack-connector',
            },
            output: {
              expected: `The response should contain either:
- The connector's name, ID, type, and configuration details (excluding secrets)
- OR a clear statement that the connector was not found
The response should NOT include irrelevant information.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.connectors,
            },
          },
          {
            input: {
              question: 'Show me the configuration of the email connector',
            },
            output: {
              expected: `The response should contain either:
- The email connector's configuration (host, port, etc., excluding credentials)
- OR a statement that no email connector exists
The response should NOT expose secret values.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.connectors,
            },
          },
          {
            input: {
              question: 'What is the webhook URL for the PagerDuty connector?',
            },
            output: {
              expected: `The response should contain either:
- The PagerDuty connector details with its configuration
- OR a statement that no PagerDuty connector exists
Secrets/API keys should be redacted or not shown.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.connectors,
            },
          },
        ],
      },
    });
  });

  evaluate('connector count and summary', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform connectors: summary',
        description: 'Evaluation scenarios for connector summaries',
        examples: [
          {
            input: {
              question: 'How many connectors do I have configured?',
            },
            output: {
              expected: `The response should contain:
- A count of configured connectors
- Optionally, a breakdown by type
The response should be concise and based on tool results only.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.connectors,
            },
          },
          {
            input: {
              question: 'Do I have any notification connectors set up?',
            },
            output: {
              expected: `The response should contain either:
- A list of notification-related connectors (Slack, Email, Teams, PagerDuty, etc.)
- OR a statement that no notification connectors exist
The response should be based on actual tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.connectors,
            },
          },
        ],
      },
    });
  });

  evaluate('connector not found handling', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform connectors: not found',
        description: 'Evaluation scenarios for handling missing connectors',
        examples: [
          {
            input: {
              question: 'Get connector with ID nonexistent-connector-id',
            },
            output: {
              expected: `The response should contain:
- A clear statement that the connector was not found
- The connector ID that was searched for
The response should handle the error gracefully.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.connectors,
            },
          },
          {
            input: {
              question: 'Show me the Salesforce connector',
            },
            output: {
              expected: `The response should contain either:
- Salesforce connector details if one exists
- OR a statement that no Salesforce connector is configured
The response should NOT make up connector information.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.connectors,
            },
          },
        ],
      },
    });
  });

  evaluate('read-only limitations', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform connectors: read-only',
        description: 'Evaluation scenarios for handling write requests',
        examples: [
          {
            input: {
              question: 'Create a new Slack connector for alerts',
            },
            output: {
              expected: `The response should contain:
- A clear explanation that connector creation is not supported through this tool
- A suggestion to use the Kibana UI or Stack Management
The response should NOT attempt to create anything.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Delete the old email connector',
            },
            output: {
              expected: `The response should contain:
- A clear explanation that connector deletion is not supported through this tool
- A suggestion to use the Kibana UI
The response should NOT attempt to delete anything.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });
});
