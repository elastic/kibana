/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform Spaces Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the spaces tool.
 * Uses the default agent (elastic-ai-agent) to test the real user experience.
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

evaluate.describe('Platform Spaces Skill', { tag: '@svlOblt' }, () => {
  // Using the default agent (elastic-ai-agent) to test the real user experience
  // No custom agent creation needed - the default agent already has spaces tools

  evaluate('list spaces', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform spaces: list operations',
        description: 'Evaluation scenarios for listing available spaces',
        examples: [
          {
            input: {
              question: 'What spaces are available in this Kibana instance?',
            },
            output: {
              expected: `Lists available spaces. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
          {
            input: {
              question: 'Show me all Kibana spaces',
            },
            output: {
              expected: `Shows all spaces with names and IDs. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
          {
            input: {
              question: 'How many spaces exist in this deployment?',
            },
            output: {
              expected: `Shows space count and list. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
          {
            input: {
              question: 'List all spaces with their identifiers',
            },
            output: {
              expected: `Lists spaces with IDs. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
        ],
      },
    });
  });

  evaluate('get active space', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform spaces: get active space',
        description: 'Evaluation scenarios for identifying the current active space',
        examples: [
          {
            input: {
              question: 'What space am I currently in?',
            },
            output: {
              expected: `The response should contain:
- The name of the current/active space
- The space ID
- May include additional context about the space`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
          {
            input: {
              question: 'Which Kibana space is this request scoped to?',
            },
            output: {
              expected: `The response should contain:
- Identification of the active space for the current request
- Space name and/or ID
- Explanation of what being in this space means`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
          {
            input: {
              question: 'Tell me about the current space context',
            },
            output: {
              expected: `The response should contain:
- Details about the currently active space
- Space name, ID, and description if available
- Explanation of the significance of space context`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
          {
            input: {
              question: 'Am I in the default space?',
            },
            output: {
              expected: `The response should contain:
- A clear yes/no answer about whether the current space is the default
- The name and ID of the current space
- Comparison to the default space if not in it`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
        ],
      },
    });
  });

  evaluate('get specific space', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform spaces: get specific space',
        description: 'Evaluation scenarios for retrieving details of a specific space',
        examples: [
          {
            input: {
              question: 'Show me details about the "default" space',
            },
            output: {
              expected: `The response should contain:
- Details about the default space including name and ID
- Description and configuration if available
- Information about features enabled in the space`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
          {
            input: {
              question: 'What is the configuration of space "production"?',
            },
            output: {
              expected: `The response should contain:
- Configuration details for the production space
- Space name, ID, description
- An error message if the space does not exist`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
          {
            input: {
              question: 'Get information about the marketing space',
            },
            output: {
              expected: `The response should contain:
- Details about the marketing space if it exists
- Space properties like name, ID, description
- A clear message if the space is not found`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
          {
            input: {
              question: 'Does the "security" space exist and what features does it have?',
            },
            output: {
              expected: `The response should contain:
- Confirmation of whether the security space exists
- Feature settings if the space exists
- Guidance if the space is not found`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
        ],
      },
    });
  });

  evaluate('space context for tool behavior', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform spaces: context understanding',
        description: 'Evaluation scenarios for understanding space context effects',
        examples: [
          {
            input: {
              question: 'Why might I see different dashboards than my colleague?',
            },
            output: {
              expected: `The response should contain:
- Explanation that spaces isolate saved objects like dashboards
- Information about the current space context
- Guidance about how to check which space users are in`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'How do spaces affect what data and objects I can access?',
            },
            output: {
              expected: `The response should contain:
- Explanation of space scoping and object isolation
- Information about the current active space
- Details about what types of objects are space-scoped`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Will my actions in this space affect other spaces?',
            },
            output: {
              expected: `The response should contain:
- Explanation that most actions are space-scoped and isolated
- Information about the current space
- Clarification about what is and isn't shared across spaces`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'I created a dashboard but my team cannot see it. Why?',
            },
            output: {
              expected: `The response should contain:
- Explanation that dashboards are space-scoped
- The current space information
- Suggestion that the team may be in a different space`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('edge cases and limitations', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform spaces: edge cases',
        description: 'Evaluation scenarios for handling edge cases and limitations',
        examples: [
          {
            input: {
              question: 'Get space with ID nonexistent-space-id',
            },
            output: {
              expected: `The response should contain:
- An error message indicating the space was not found
- Suggestion to list available spaces to find valid IDs
- Graceful handling without crashing`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.spaces,
            },
          },
          {
            input: {
              question: 'Create a new space called "development"',
            },
            output: {
              expected: `The response should contain:
- Explanation that space creation is not supported through this tool
- The tool is read-only
- Suggestion to use the Kibana Spaces management UI`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Delete the test space',
            },
            output: {
              expected: `The response should contain:
- Explanation that delete operations are not supported
- Suggestion to use the Kibana UI for space management
- The tool's read-only nature`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Switch to a different space',
            },
            output: {
              expected: `The response should contain:
- Explanation that programmatic space switching is not possible
- Guidance on how to switch spaces via the Kibana UI
- The current space information`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Rename the current space',
            },
            output: {
              expected: `The response should contain:
- Explanation that this tool is read-only
- Suggestion to use Kibana Space management for updates
- The current space information`,
            },
            metadata: {},
          },
        ],
      },
    });
  });
});
