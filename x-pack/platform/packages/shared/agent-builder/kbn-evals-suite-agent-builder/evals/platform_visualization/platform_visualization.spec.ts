/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform Visualization Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the create_visualization tool.
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

evaluate.describe('Platform Visualization Skill', { tag: '@svlOblt' }, () => {
  // Using the default agent (elastic-ai-agent) to test the real user experience
  // No custom agent creation needed - the default agent already has visualization tools

  evaluate('create basic visualizations', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform visualization: basic creation',
        description: 'Evaluation scenarios for creating basic visualizations with confirmation',
        examples: [
          {
            input: {
              question:
                'Create a bar chart showing document count by log level from logs-*. I confirm this action.',
            },
            output: {
              expected: `Creates bar chart with count by log level. Returns link or ID.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
          {
            input: {
              question:
                'Create a line chart showing request count over time from the metrics-* index. Confirmed.',
            },
            output: {
              expected: `Creates line chart with time-series count. Returns link or ID.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
          {
            input: {
              question:
                'Create a pie chart showing distribution of HTTP methods from web logs. I confirm.',
            },
            output: {
              expected: `Creates pie chart showing HTTP method distribution. Returns link or ID.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
          {
            input: {
              question:
                'Create a table visualization showing top 10 hosts by event count. Please confirm.',
            },
            output: {
              expected: `Creates data table with top 10 hosts by count. Returns link or ID.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
        ],
      },
    });
  });

  evaluate('metric-based visualizations', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform visualization: metrics',
        description: 'Evaluation scenarios for creating visualizations with different metrics',
        examples: [
          {
            input: {
              question:
                'Create a visualization showing average response time by service. I confirm.',
            },
            output: {
              expected: `The response should contain:
- Confirmation that visualization was created
- Average metric on response time field
- Breakdown by service.name
- Appropriate chart type (bar or line)`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
          {
            input: {
              question:
                'Create a chart showing sum of bytes transferred by destination country. Confirmed.',
            },
            output: {
              expected: `The response should contain:
- Confirmation of visualization creation
- Sum metric on bytes field
- Breakdown by destination country
- Link or ID to access it`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
          {
            input: {
              question: 'Show me a visualization of unique user count by day. I confirm this.',
            },
            output: {
              expected: `The response should contain:
- Confirmation of time-series visualization
- Unique count (cardinality) metric on user.id
- Daily time breakdown
- Link or ID to the visualization`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
          {
            input: {
              question:
                'Create a visualization showing max CPU usage per host over time. Confirmed.',
            },
            output: {
              expected: `The response should contain:
- Confirmation of visualization creation
- Max metric on CPU field
- Breakdown by host.name and time
- Link or ID to access it`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
        ],
      },
    });
  });

  evaluate('filtered visualizations', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform visualization: filtered',
        description: 'Evaluation scenarios for creating visualizations with filters',
        examples: [
          {
            input: {
              question:
                'Create a chart showing error count over time, filtered to only HTTP 500 errors. I confirm.',
            },
            output: {
              expected: `The response should contain:
- Confirmation of visualization with filter applied
- Filter for status_code == 500
- Time-based error count
- Link or ID to the visualization`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
          {
            input: {
              question:
                'Create a visualization of failed login attempts by user, for the last 7 days. Confirmed.',
            },
            output: {
              expected: `The response should contain:
- Confirmation of filtered visualization
- Filter for failed authentication events
- Breakdown by user.name
- 7 day time range applied`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
          {
            input: {
              question:
                'Show request latency distribution for the /api/users endpoint only. I confirm this.',
            },
            output: {
              expected: `The response should contain:
- Confirmation of visualization with endpoint filter
- Latency distribution shown (histogram or similar)
- Filter for url.path == "/api/users"
- Link or ID to access it`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
          {
            input: {
              question:
                'Create a chart of events from production environment excluding health checks. Confirmed.',
            },
            output: {
              expected: `The response should contain:
- Confirmation of visualization with complex filter
- Production environment filter
- Health check exclusion
- Link or ID to the visualization`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
        ],
      },
    });
  });

  evaluate('chart type selection', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform visualization: chart types',
        description: 'Evaluation scenarios for appropriate chart type selection',
        examples: [
          {
            input: {
              question: 'What chart type should I use to show trends in error rates over time?',
            },
            output: {
              expected: `The response should contain:
- Recommendation for line chart or area chart
- Explanation that line charts show changes over time
- Best for identifying patterns and trends`,
            },
            metadata: {},
          },
          {
            input: {
              question:
                'I want to compare request counts across different services. What visualization works best?',
            },
            output: {
              expected: `The response should contain:
- Recommendation for bar chart
- Explanation that bars enable easy comparison
- Horizontal or vertical bars for categories`,
            },
            metadata: {},
          },
          {
            input: {
              question:
                'How should I visualize the proportion of traffic from different countries?',
            },
            output: {
              expected: `The response should contain:
- Recommendation for pie chart or treemap
- Pie charts for part-to-whole relationships
- Note about number of categories (fewer is better for pie)`,
            },
            metadata: {},
          },
          {
            input: {
              question:
                'Create a heatmap showing request count by hour of day and day of week. I confirm.',
            },
            output: {
              expected: `The response should contain:
- Confirmation that heatmap was created
- Hour on one axis, day of week on another
- Color intensity based on count
- Link or ID to access it`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.createVisualization,
            },
          },
        ],
      },
    });
  });

  evaluate('confirmation workflow', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform visualization: confirmation',
        description: 'Evaluation scenarios for proper confirmation handling',
        examples: [
          {
            input: {
              question: 'Create a visualization showing error counts by service',
            },
            output: {
              expected: `The response should contain:
- Clarifying questions about data source and time range
- Chart type preferences requested
- Summary of what will be created
- Request for explicit confirmation`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'I want a chart but I am not sure what to visualize',
            },
            output: {
              expected: `The response should contain:
- Questions about what the user wants to analyze
- What insights they hope to gain
- Guidance toward useful visualization options`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Create a visualization of everything',
            },
            output: {
              expected: `The response should contain:
- Request for specific details needed
- What metric to show
- What dimension to break down by
- Which data source to use`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Make me a dashboard with all the important metrics',
            },
            output: {
              expected: `The response should contain:
- Clarification that this tool creates individual visualizations
- Not full dashboards
- Offer to create specific visualizations one at a time
- Questions about what metrics are important`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('data source exploration', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform visualization: data exploration',
        description: 'Evaluation scenarios combining data exploration with visualization',
        examples: [
          {
            input: {
              question:
                'I want to create a visualization but I am not sure what fields are available. Can you help?',
            },
            output: {
              expected: `The response should contain:
- Available fields from the data source
- Options for metrics and breakdowns
- Suggestions based on data schema`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'What visualizations can I create from the APM data?',
            },
            output: {
              expected: `The response should contain:
- APM data structure overview
- Suggested visualizations (response time, error rates)
- Key metrics available for visualization`,
            },
            metadata: {},
          },
          {
            input: {
              question:
                'Check if there is a data view for logs and then create a log level distribution chart. I confirm.',
            },
            output: {
              expected: `The response should contain:
- Data view check results
- Confirmation of chart creation
- Log level distribution visualization
- Link or ID to access it`,
            },
            metadata: {},
          },
        ],
      },
    });
  });

  evaluate('edge cases and errors', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform visualization: edge cases',
        description: 'Evaluation scenarios for handling edge cases and errors',
        examples: [
          {
            input: {
              question:
                'Create a visualization from an index that does not exist: fake-index-*. I confirm.',
            },
            output: {
              expected: `The response should contain:
- Error handling for nonexistent index
- Suggestion to check available indices
- Graceful failure message`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Create a visualization with a field that does not exist. I confirm.',
            },
            output: {
              expected: `The response should contain:
- Request for clarification on field and index
- Error handling if field doesn't exist
- Suggestion to use index_explorer for valid fields`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Delete all my visualizations',
            },
            output: {
              expected: `The response should contain:
- Explanation that this tool creates, not deletes
- Suggestion to use Kibana UI for deletion
- Alternative: saved_objects tool for management`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Update an existing visualization to change its title',
            },
            output: {
              expected: `The response should contain:
- Explanation that create_visualization creates new ones
- Suggestion for updates via saved_objects tool
- Guidance on recreating with desired changes`,
            },
            metadata: {},
          },
        ],
      },
    });
  });
});
