/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate as base } from '../src/evaluate';
import type { EvaluateDataset } from '../src/evaluate_dataset';
import { createEvaluateDataset } from '../src/evaluate_dataset';

const evaluate = base.extend<{ evaluateDataset: EvaluateDataset }, {}>({
  evaluateDataset: [
    ({ chatClient, evaluators, executorClient, traceEsClient, log }, use) => {
      use(
        createEvaluateDataset({
          chatClient,
          evaluators,
          executorClient,
          traceEsClient,
          log,
        })
      );
    },
    { scope: 'test' },
  ],
});

evaluate.describe('Dashboard Agent - Dashboard Creation', { tag: tags.serverless.search }, () => {
  evaluate.beforeAll(async ({ fetch }) => {
    await fetch('/api/sample_data/logs', {
      method: 'POST',
      version: '2023-10-31',
    });
  });

  evaluate('basic creation', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'dashboard-agent: basic-creation',
        description:
          'Tests basic dashboard creation with panels using kibana_sample_data_logs index',
        examples: [
          {
            input: {
              question:
                "Create a dashboard titled 'Web Traffic Overview' with description 'Monitors web traffic from sample logs' using the kibana_sample_data_logs index. Add panels for total requests over time, bytes transferred over time, and response code distribution.",
            },
            output: {
              expectedTitle: 'Web Traffic Overview',
              expectedMinPanels: 3,
            },
          },
          {
            input: {
              question:
                'Create a dashboard for the kibana_sample_data_logs index. Include panels for request count over time grouped by response.keyword, and a breakdown of traffic by machine.os.keyword.',
            },
            output: {
              expectedMinPanels: 2,
            },
          },
          {
            input: {
              question:
                "Build a dashboard called 'Geo Traffic Summary' using kibana_sample_data_logs. Show total bytes as a metric, and a breakdown of requests by geo.src.",
            },
            output: {
              expectedMinPanels: 2,
            },
          },
        ],
      },
    });
  });

  evaluate('layout and sections', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'dashboard-agent: layout-and-sections',
        description:
          'Tests dashboard creation with sections and layout using kibana_sample_data_logs index',
        examples: [
          {
            input: {
              question:
                "Create a dashboard using kibana_sample_data_logs. Create a section called 'Response Codes' with a panel showing response.keyword distribution, and a section called 'Traffic Volume' with a panel showing bytes over time.",
            },
            output: {
              expectedSectionCount: 2,
              expectedMinPanels: 2,
            },
          },
          {
            input: {
              question:
                'Create a dashboard for kibana_sample_data_logs with a markdown summary at the top explaining the dashboard purpose, followed by metric panels for total requests and average bytes below.',
            },
            output: {
              expectsMarkdown: true,
              expectedMinPanels: 2,
            },
          },
          {
            input: {
              question:
                "Create a dashboard using kibana_sample_data_logs with 3 sections: 'Overview' with a request count over time panel, 'By OS' with a breakdown by machine.os.keyword, and 'By Geography' with a breakdown by geo.src.",
            },
            output: {
              expectedSectionCount: 3,
              expectedMinPanels: 3,
            },
          },
        ],
      },
    });
  });

  evaluate('edge cases', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'dashboard-agent: edge-cases',
        description: 'Tests edge case dashboard creation scenarios',
        examples: [
          {
            input: {
              question: 'Create a dashboard using the kibana_sample_data_logs index.',
            },
            output: {},
          },
          {
            input: {
              question:
                'Create a dashboard for kibana_sample_data_logs and include a markdown panel summarizing the key metrics being tracked.',
            },
            output: {
              expectsMarkdown: true,
              expectedMinPanels: 2,
            },
          },
        ],
      },
    });
  });
});
