/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Platform Data Views Skill Evaluations
 *
 * Tests the DEFAULT agent's ability to use the data_views tool.
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

interface DataViewResponse {
  data_view: {
    id: string;
    title: string;
    name?: string;
    timeFieldName?: string;
  };
}

const DATA_VIEWS_API_BASE_PATH = '/api/data_views/data_view';

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

evaluate.describe('Platform Data Views Skill', { tag: '@svlOblt' }, () => {
  const createdDataViewIds: string[] = [];

  evaluate.beforeAll(async ({ fetch, log }) => {
    // Create test data views for evaluation
    log.info('Creating test data views for evaluation');

    // Create a basic logs data view
    try {
      const logsDataView = (await fetch(DATA_VIEWS_API_BASE_PATH, {
        method: 'POST',
        body: JSON.stringify({
          data_view: {
            title: 'eval-logs-*',
            name: 'Eval Logs Data View',
            timeFieldName: '@timestamp',
          },
        }),
      })) as DataViewResponse;
      createdDataViewIds.push(logsDataView.data_view.id);
      log.debug(`Created logs data view: ${logsDataView.data_view.id}`);
    } catch (e) {
      log.warning(`Failed to create logs data view: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Create a metrics data view
    try {
      const metricsDataView = (await fetch(DATA_VIEWS_API_BASE_PATH, {
        method: 'POST',
        body: JSON.stringify({
          data_view: {
            title: 'eval-metrics-*',
            name: 'Eval Metrics Data View',
            timeFieldName: '@timestamp',
          },
        }),
      })) as DataViewResponse;
      createdDataViewIds.push(metricsDataView.data_view.id);
      log.debug(`Created metrics data view: ${metricsDataView.data_view.id}`);
    } catch (e) {
      log.warning(
        `Failed to create metrics data view: ${e instanceof Error ? e.message : String(e)}`
      );
    }

    // Create a security data view without a time field
    try {
      const securityDataView = (await fetch(DATA_VIEWS_API_BASE_PATH, {
        method: 'POST',
        body: JSON.stringify({
          data_view: {
            title: 'eval-security-*',
            name: 'Eval Security Data View',
          },
        }),
      })) as DataViewResponse;
      createdDataViewIds.push(securityDataView.data_view.id);
      log.debug(`Created security data view: ${securityDataView.data_view.id}`);
    } catch (e) {
      log.warning(
        `Failed to create security data view: ${e instanceof Error ? e.message : String(e)}`
      );
    }
  });

  evaluate.afterAll(async ({ fetch, log }) => {
    // Clean up created data views
    for (const dataViewId of createdDataViewIds) {
      try {
        await fetch(`${DATA_VIEWS_API_BASE_PATH}/${encodeURIComponent(dataViewId)}`, {
          method: 'DELETE',
        });
        log.debug(`Deleted data view: ${dataViewId}`);
      } catch (e) {
        log.warning(
          `Failed to delete data view "${dataViewId}": ${e instanceof Error ? e.message : String(e)
          }`
        );
      }
    }
  });

  evaluate('find data views', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform data views: find operations',
        description: 'Evaluation scenarios for finding and listing data views',
        examples: [
          {
            input: {
              question: 'List all available data views',
            },
            output: {
              expected: `Lists data views or indicates none exist. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: 'Find data views that match the pattern "eval-*"',
            },
            output: {
              expected: `Shows matching data views (eval-logs-*, etc.) or none. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: 'What data views do I have for logs data?',
            },
            output: {
              expected: `Shows logs-related data views or none. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: 'Show me data views that have a time field configured',
            },
            output: {
              expected: `Shows data views with time fields configured. Uses tool results.`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
        ],
      },
    });
  });

  evaluate('get data view by id', async ({ evaluateDataset }) => {
    const testDataViewId = createdDataViewIds[0]; // The logs data view

    await evaluateDataset({
      dataset: {
        name: 'platform data views: get by id',
        description: 'Evaluation scenarios for retrieving specific data views by their ID',
        examples: [
          {
            input: {
              question: `Get the details of data view ${testDataViewId}`,
            },
            output: {
              expected: `The response should contain:
- Data view details including title and name
- Time field configuration
- Field mappings if available
- Error if data view not found`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: `What is the time field for data view ${testDataViewId}?`,
            },
            output: {
              expected: `The response should contain:
- The time field name (@timestamp for eval-logs-*)
- Confirmation of the field configuration
- Error if data view not found`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: `Show me the configuration of the eval-logs-* data view`,
            },
            output: {
              expected: `The response should contain:
- Configuration details for eval-logs-*
- Title, name, and time field
- ID for reference`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
        ],
      },
    });
  });

  evaluate('create data view', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform data views: create operations',
        description: 'Evaluation scenarios for creating new data views with confirmation',
        examples: [
          {
            input: {
              question:
                'Create a new data view for the apm-* index pattern with @timestamp as the time field. I confirm this action.',
            },
            output: {
              expected: `The response should contain:
- Check for existing apm-* data view first
- Confirmation of creation with details
- New data view ID and configuration
- Error if creation failed`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question:
                'I need a new data view called "Application Traces" for traces-* with timestamp as the time field. Please create it.',
            },
            output: {
              expected: `The response should contain:
- Verification no duplicate exists
- Confirmation of creation
- Data view details (name, title, time field)
- New data view ID`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question:
                'Create a data view for static lookup data without a time field. Index pattern: lookup-tables-*',
            },
            output: {
              expected: `The response should contain:
- Confirmation of creation without time field
- Data view details showing no timeFieldName
- New data view ID
- Note about non-time-series nature`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: 'Create a data view for filebeat-* data',
            },
            output: {
              expected: `The response should contain:
- Request for confirmation before creating
- Question about time field preference
- Summary of what will be created
- Waits for explicit confirmation`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
        ],
      },
    });
  });

  evaluate('update data view', async ({ evaluateDataset }) => {
    const testDataViewId = createdDataViewIds[0]; // The logs data view

    await evaluateDataset({
      dataset: {
        name: 'platform data views: update operations',
        description: 'Evaluation scenarios for updating existing data views with confirmation',
        examples: [
          {
            input: {
              question: `Change the name of data view ${testDataViewId} to "Production Logs". I confirm this update.`,
            },
            output: {
              expected: `The response should contain:
- Current data view details shown first
- Confirmation of the name update
- Updated data view configuration
- Error if update failed`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question:
                'Update the eval-metrics-* data view to use "event.timestamp" as the time field. Confirmed.',
            },
            output: {
              expected: `The response should contain:
- Current configuration shown
- Confirmation of time field change
- Updated data view details
- Error if update failed`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: 'Rename the eval-security-* data view to "Security Events"',
            },
            output: {
              expected: `The response should contain:
- Current data view details
- Request for explicit confirmation
- Does not update without confirmation
- Summary of proposed change`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
        ],
      },
    });
  });

  evaluate('safe workflow patterns', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform data views: safe workflows',
        description: 'Evaluation scenarios for following safe data view management workflows',
        examples: [
          {
            input: {
              question: 'I want to create a data view for my new heartbeat-* monitoring data',
            },
            output: {
              expected: `The response should contain:
- Check for existing heartbeat-* data views first
- Question about time field preference
- Request for confirmation before creating
- Summary of proposed configuration`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question:
                'Check if there is already a data view for logs-* before I create a new one',
            },
            output: {
              expected: `The response should contain:
- Search results for logs-* pattern
- List of matching data views if found
- Their configurations and IDs
- Recommendation based on findings`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question:
                'Show me the current eval-logs-* data view config, then update its name to "Evaluation Logs"',
            },
            output: {
              expected: `The response should contain:
- Current configuration details displayed
- Request for confirmation to update
- Does not update without confirmation
- Summary of proposed changes`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
        ],
      },
    });
  });

  evaluate('error handling and edge cases', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform data views: edge cases',
        description: 'Evaluation scenarios for handling edge cases and ambiguous requests',
        examples: [
          {
            input: {
              question: 'Get data view with ID non-existent-id-12345',
            },
            output: {
              expected: `The response should contain:
- Error message indicating not found
- Graceful handling without crashing
- Suggestion to list available data views`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: 'Create a data view',
            },
            output: {
              expected: `The response should contain:
- Request for required information
- Questions about index pattern (title)
- Questions about name and time field
- Does not create without details`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Delete the eval-logs-* data view',
            },
            output: {
              expected: `The response should contain:
- Explanation that delete is not supported
- Alternative guidance for Kibana UI
- The tool's read-only limitation`,
            },
            metadata: {},
          },
          {
            input: {
              question: 'Create a data view for * (all indices)',
            },
            output: {
              expected: `The response should contain:
- Warning about broad scope
- Request for confirmation
- Question about time field
- Explanation of implications`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
        ],
      },
    });
  });

  evaluate('data view inspection', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'platform data views: inspection',
        description: 'Evaluation scenarios for inspecting data view details and configurations',
        examples: [
          {
            input: {
              question: 'How many data views are configured in this Kibana instance?',
            },
            output: {
              expected: `The response should contain:
- Total count of data views
- Optionally a list of data views
- May include breakdown by type or pattern`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: 'Which data views are configured for time-series data?',
            },
            output: {
              expected: `The response should contain:
- Data views with timeFieldName configured
- List of their names and time fields
- Distinction from non-time-series data views`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
          {
            input: {
              question: 'Compare the configuration of eval-logs-* and eval-metrics-* data views',
            },
            output: {
              expected: `The response should contain:
- Configuration details for both data views
- Comparison of titles, names, time fields
- Similarities and differences highlighted`,
            },
            metadata: {
              expectedOnlyToolId: platformCoreTools.dataViews,
            },
          },
        ],
      },
    });
  });
});
