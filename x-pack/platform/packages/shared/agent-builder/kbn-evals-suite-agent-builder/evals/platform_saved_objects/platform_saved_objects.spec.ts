/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform Saved Objects Skill Evaluations
 *
 * These evaluations test the DEFAULT agent's ability to use the saved_objects tool.
 * We intentionally use the default agent (elastic-ai-agent) to test the same
 * experience that users have when interacting with the agent.
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

evaluate.describe('Platform Saved Objects Skill', { tag: '@svlOblt' }, () => {
  // Using the default agent (elastic-ai-agent) to test the real user experience
  // No custom agent creation needed - the default agent already has saved objects tools

  evaluate('find saved objects', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform saved objects: find operations',
        description: 'Evaluation scenarios for finding and searching saved objects using the default agent',
        examples: [
          {
            input: {
              question: 'Find all dashboards',
            },
            output: {
              expected: `Lists dashboards or indicates none found. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Search for visualizations containing "CPU" in the title',
            },
            output: {
              expected: `Shows matching visualizations or indicates none. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'List all saved searches in Kibana',
            },
            output: {
              expected: `Lists saved searches or indicates none found. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Find all Lens visualizations',
            },
            output: {
              expected: `Lists Lens visualizations or indicates none. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'What maps are available in this space?',
            },
            output: {
              expected: `Lists available maps or indicates none. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
        ],
      },
    });
  });

  evaluate('get saved object details', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform saved objects: get details',
        description: 'Evaluation scenarios for retrieving specific saved object details',
        examples: [
          {
            input: {
              question: 'Get the details of dashboard dashboard-abc-123',
            },
            output: {
              expected: `The response should contain:
- The dashboard details for the specified ID
- Title and description if available
- Information about panels or references included
- If not found, a clear message indicating the dashboard doesn't exist`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Show me the configuration of the "Production Overview" dashboard',
            },
            output: {
              expected: `The response should contain:
- The dashboard configuration details
- Title, description, and panel information
- Referenced visualizations or saved searches
- If not found, indicate no dashboard with that title exists`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'What visualizations are included in dashboard xyz-789?',
            },
            output: {
              expected: `The response should contain:
- A list of visualizations included in the dashboard
- Each visualization's title or ID
- If dashboard not found, indicate it doesn't exist
- May include visualization types`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Get the saved search with ID search-abc',
            },
            output: {
              expected: `The response should contain:
- The saved search configuration
- Title, columns, and filter information if available
- The index pattern or data view it queries
- If not found, indicate the saved search doesn't exist`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
        ],
      },
    });
  });

  evaluate('create saved objects', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform saved objects: create operations',
        description: 'Evaluation scenarios for creating new saved objects with confirmation',
        examples: [
          {
            input: {
              question:
                'Create a new dashboard called "My Monitoring Dashboard". I confirm this action.',
            },
            output: {
              expected: `The response should contain:
- Confirmation that the dashboard was created
- The new dashboard's ID
- The title "My Monitoring Dashboard" acknowledged
- May include a link or instructions to access the new dashboard`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Create a saved search for error logs from logs-* index. Confirmed.',
            },
            output: {
              expected: `The response should contain:
- Confirmation that the saved search was created
- The new saved search ID
- Acknowledgment of the logs-* index configuration
- May include the query or filter details`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question:
                'I want to create an index pattern for my new data. Pattern: custom-logs-*. I confirm.',
            },
            output: {
              expected: `The response should contain:
- Confirmation that the index pattern was created
- The pattern "custom-logs-*" acknowledged
- The new index pattern ID
- May mention time field configuration if applicable`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Create a new dashboard for me',
            },
            output: {
              expected: `The response should:
- Ask for the dashboard title before proceeding
- Request confirmation before creating
- Not create anything without explicit user confirmation`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('update saved objects', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform saved objects: update operations',
        description: 'Evaluation scenarios for updating existing saved objects with confirmation',
        examples: [
          {
            input: {
              question:
                'Update the title of dashboard dashboard-abc-123 to "Production Metrics". I confirm this update.',
            },
            output: {
              expected: `The response should contain:
- Confirmation that the dashboard title was updated
- The new title "Production Metrics" acknowledged
- If dashboard not found, indicate it doesn't exist
- May show the previous title for reference`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Rename the "Old Dashboard" to "New Dashboard Name". Confirmed.',
            },
            output: {
              expected: `The response should contain:
- Confirmation that the dashboard was renamed
- The new title acknowledged
- If multiple dashboards match, ask for clarification
- If not found, indicate no dashboard with that title exists`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question:
                'Update the description of visualization viz-xyz to "Shows CPU metrics over time". I confirm.',
            },
            output: {
              expected: `The response should contain:
- Confirmation that the visualization description was updated
- The new description acknowledged
- If visualization not found, indicate it doesn't exist`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Change the title of a dashboard',
            },
            output: {
              expected: `The response should:
- Ask which dashboard to update
- Ask what the new title should be
- Request explicit confirmation before making changes
- Not update anything without confirmation`,
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
        name: 'platform saved objects: safe workflows',
        description: 'Evaluation scenarios for following safe saved object management workflows',
        examples: [
          {
            input: {
              question: 'Show me the "Production" dashboard and then update its title',
            },
            output: {
              expected: `The response should:
- First show the current dashboard details
- Ask what the new title should be
- Request confirmation before making the update
- Not update without explicit user confirmation`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'I want to update a visualization but I am not sure which one',
            },
            output: {
              expected: `The response should contain:
- A list of available visualizations to choose from
- Help identifying the correct one
- Ask which visualization to update before proceeding`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question:
                'Check if a dashboard named "Metrics Overview" exists, and if not, create it',
            },
            output: {
              expected: `The response should:
- Report whether the dashboard exists
- If found, show its details
- If not found, ask for confirmation before creating
- Not create without explicit confirmation`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question:
                'Find the visualization "Error Rate Chart" and tell me its ID so I can add it to a dashboard',
            },
            output: {
              expected: `The response should contain:
- The visualization ID if found
- The visualization title confirmed
- If not found, indicate it doesn't exist
- May include other relevant details like type`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
        ],
      },
    });
  });

  evaluate('saved object type exploration', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform saved objects: type exploration',
        description: 'Evaluation scenarios for exploring different saved object types',
        examples: [
          {
            input: {
              question: 'What types of saved objects can I search for?',
            },
            output: {
              expected: `The response should contain:
- A list of common saved object types (dashboard, visualization, search, index-pattern, lens, map, etc.)
- Brief explanations of what each type represents
- May include examples of how to search for each type`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'How many dashboards and visualizations do I have?',
            },
            output: {
              expected: `The response should contain:
- The count of dashboards found
- The count of visualizations found
- Zero counts are valid if none exist
- May include a summary or breakdown`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Find all index patterns configured in this space',
            },
            output: {
              expected: `The response should contain:
- A list of index patterns with their titles
- Time field information if available
- Zero results is valid if none exist
- May include pattern details like logs-* or metrics-*`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'What Canvas workpads are available?',
            },
            output: {
              expected: `The response should contain:
- A list of Canvas workpads with their names
- Zero results is valid if none exist
- May include workpad IDs or descriptions`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
        ],
      },
    });
  });

  evaluate('search and filter saved objects', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform saved objects: search and filter',
        description: 'Evaluation scenarios for advanced search and filtering',
        examples: [
          {
            input: {
              question: 'Find all saved objects with "production" in the title',
            },
            output: {
              expected: `The response should contain:
- Saved objects that match "production" in their title
- Results from various types (dashboards, visualizations, etc.)
- Zero results is valid if no matches exist
- May include the type of each matching object`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'List dashboards tagged with "observability"',
            },
            output: {
              expected: `The response should contain:
- Dashboards that have the "observability" tag
- Zero results is valid if no dashboards have that tag
- May include other dashboard details like title and description`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Find the 5 most recently modified dashboards',
            },
            output: {
              expected: `The response should contain:
- Up to 5 dashboards sorted by modification date
- The most recently modified first
- Modification dates or relative times
- Fewer than 5 is valid if fewer dashboards exist`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Search for visualizations that reference the logs-* index pattern',
            },
            output: {
              expected: `The response should contain:
- Visualizations that use the logs-* data view
- Zero results is valid if none reference it
- May include visualization names and types`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
        ],
      },
    });
  });

  evaluate('edge cases and error handling', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform saved objects: edge cases',
        description: 'Evaluation scenarios for handling edge cases and errors',
        examples: [
          {
            input: {
              question: 'Get dashboard with ID nonexistent-dashboard-id',
            },
            output: {
              expected: `The response should:
- Indicate that the dashboard was not found
- Handle the error gracefully without crashing
- Suggest searching by title or listing available dashboards
- Not show a raw error message to the user`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Delete the old test dashboard',
            },
            output: {
              expected: `The response should:
- Explain that delete operations are not supported through this tool
- Suggest using the Kibana UI (Stack Management > Saved Objects)
- Not attempt a delete operation`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Find saved objects of type "unknown_type"',
            },
            output: {
              expected: `The response should:
- Handle the invalid or unknown type gracefully
- Indicate no results or explain the type is not recognized
- Suggest valid saved object types (dashboard, visualization, search, etc.)`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Update a dashboard without knowing its ID',
            },
            output: {
              expected: `The response should:
- Help identify the dashboard by listing or searching
- Ask for clarification on which dashboard to update
- Not proceed with an update without identifying the correct dashboard`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Export all my dashboards',
            },
            output: {
              expected: `The response should:
- Explain that export is not available through this tool
- Suggest using Kibana's Saved Objects export feature
- May provide instructions on where to find the export functionality`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('dashboard and visualization relationships', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform saved objects: relationships',
        description: 'Evaluation scenarios for understanding saved object relationships',
        examples: [
          {
            input: {
              question: 'What visualizations are used in the "Overview" dashboard?',
            },
            output: {
              expected: `The response should contain:
- A list of visualizations included in the dashboard
- Visualization titles or IDs
- If dashboard not found, indicate it doesn't exist
- Zero visualizations is valid if dashboard is empty`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Which dashboards use the "Error Rate" visualization?',
            },
            output: {
              expected: `The response should contain:
- Dashboards that include the specified visualization
- Dashboard titles and IDs
- Zero results is valid if no dashboards use it
- If visualization not found, indicate it doesn't exist`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'What data view does the "Response Time" visualization use?',
            },
            output: {
              expected: `The response should contain:
- The data view or index pattern used by the visualization
- The pattern name (e.g., logs-*, metrics-*)
- If visualization not found, indicate it doesn't exist`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
          {
            input: {
              question: 'Find all visualizations that depend on the logs-* data view',
            },
            output: {
              expected: `The response should contain:
- Visualizations that use the logs-* index pattern
- Zero results is valid if none use it
- May include visualization types or titles`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.savedObjects,
            },
          },
        ],
      },
    });
  });
});
