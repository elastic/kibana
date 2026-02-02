/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform Tags Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the tags tool.
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

evaluate.describe('Platform Tags Skill', { tag: '@svlOblt' }, () => {
  // Using the default agent (elastic-ai-agent) to test the real user experience
  // No custom agent creation needed - the default agent already has tags tools

  evaluate('list tags', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform tags: list operations',
        description: 'Evaluation scenarios for listing available tags',
        examples: [
          {
            input: {
              question: 'What tags are available?',
            },
            output: {
              expected: `No tags are currently available or configured in this space. There are 0 tags found.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.tags,
            },
          },
          {
            input: {
              question: 'Show me all tags in this space',
            },
            output: {
              expected: `There are no tags configured in this Kibana space. Found 0 tags.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.tags,
            },
          },
          {
            input: {
              question: 'List tags I can use to organize my dashboards',
            },
            output: {
              expected: `No tags are available to organize dashboards. Tags can be used to organize saved objects like dashboards but none are configured.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.tags,
            },
          },
          {
            input: {
              question: 'How many tags exist?',
            },
            output: {
              expected: `There are 0 tags. No tags exist or are configured in this space.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.tags,
            },
          },
        ],
      },
    });
  });

  evaluate('get tag details', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform tags: get details',
        description: 'Evaluation scenarios for retrieving specific tag details',
        examples: [
          {
            input: {
              question: 'Get details about the tag with ID tag-abc-123',
            },
            output: {
              expected: `Shows tag details or indicates tag not found. Uses tool results directly.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.tags,
            },
          },
          {
            input: {
              question: 'Show me information about the "production" tag',
            },
            output: {
              expected: `Shows production tag configuration or indicates it doesn't exist. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.tags,
            },
          },
          {
            input: {
              question: 'What color is the "important" tag?',
            },
            output: {
              expected: `Shows tag color or indicates tag doesn't exist. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.tags,
            },
          },
        ],
      },
    });
  });

  evaluate('create tags with confirmation', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform tags: create operations',
        description: 'Evaluation scenarios for creating new tags with confirmation',
        examples: [
          {
            input: {
              question: 'Create a new tag called "critical" with red color. I confirm.',
            },
            output: {
              expected: `Creates tag or reports result. May warn about duplicates.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'I need a tag for "staging" environments',
            },
            output: {
              expected: `Either creates tag or asks for confirmation/details before creating.`,
            },
            metadata: {},
          },
          {
            input: {
              question:
                'Create tags "frontend" and "backend" for categorizing dashboards. Confirmed.',
            },
            output: {
              expected: `Creates tags or reports results. May report errors for any failures.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Add a "deprecated" tag with gray color and description "For old items"',
            },
            output: {
              expected: `Creates tag or asks for confirmation with proposed details.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('update tags with confirmation', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform tags: update operations',
        description: 'Evaluation scenarios for updating existing tags with confirmation',
        examples: [
          {
            input: {
              question: 'Change the color of the "important" tag to orange. I confirm this change.',
            },
            output: {
              expected: `Updates tag color or indicates tag not found. Reports result.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Update the description of tag tag-xyz-789 to "High priority items"',
            },
            output: {
              expected: `Updates tag or asks for confirmation first. May show current vs proposed.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Rename the "temp" tag to "temporary". Confirmed.',
            },
            output: {
              expected: `Renames tag or indicates tag not found. Reports result.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('assign tags to objects', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform tags: assign to objects',
        description: 'Evaluation scenarios for assigning tags to saved objects',
        examples: [
          {
            input: {
              question:
                'Add the "production" tag to dashboard dashboard-abc-123. I confirm this action.',
            },
            output: {
              expected: `Assigns tag or reports error if dashboard/tag not found.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Tag the visualization viz-xyz-789 with "important" and "monitoring"',
            },
            output: {
              expected: `Assigns tags or asks for confirmation first.`,
            },
            metadata: {},
          },
          {
            input: {
              question:
                'Remove the "deprecated" tag from dashboard my-dashboard. I confirm this removal.',
            },
            output: {
              expected: `Removes tag assignment or reports error if not found.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'What tags are assigned to dashboard abc-123?',
            },
            output: {
              expected: `Lists tags assigned to dashboard or indicates none. Uses tool results.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('safe workflow patterns', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform tags: safe patterns',
        description: 'Evaluation scenarios for following safe tag management patterns',
        examples: [
          {
            input: {
              question: 'Create a tag',
            },
            output: {
              expected: `Asks for tag details (name, color) or explains what info is needed.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Add a tag to my dashboard',
            },
            output: {
              expected: `Asks which tag and which dashboard, or lists available options.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Tag all my visualizations with "team-data"',
            },
            output: {
              expected: `Asks for specific visualization IDs or explains bulk operations need explicit list.`,
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
        name: 'platform tags: edge cases',
        description: 'Evaluation scenarios for handling edge cases and limitations',
        examples: [
          {
            input: {
              question: 'Get tag with ID nonexistent-tag-id',
            },
            output: {
              expected: `Indicates tag not found. Handles gracefully without crashing.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.tags,
            },
          },
          {
            input: {
              question: 'Delete the "old" tag',
            },
            output: {
              expected: `Explains delete limitation or suggests using Kibana UI for tag deletion.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Create a tag called "production" (assuming it already exists)',
            },
            output: {
              expected: `Checks for existing tag and warns about duplicate or creates if not exists.`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Can I tag an index or data stream?',
            },
            output: {
              expected: `Explains tags are for saved objects (dashboards, visualizations) not indices.`,
            },
            metadata: {},
          },
        ],
      },
    });
  });
});
