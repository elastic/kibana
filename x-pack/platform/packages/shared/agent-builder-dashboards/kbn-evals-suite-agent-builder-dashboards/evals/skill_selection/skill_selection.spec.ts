/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/scout';
import { evaluate as base } from '../../src/evaluate';
import type { EvaluateDataset } from '../../src/evaluate_dataset';
import { createEvaluateDataset } from '../../src/evaluate_dataset';
import {
  dashboardSkillActivatedEvaluator,
  dashboardSkillNotActivatedEvaluator,
  visualizationSkillWithoutDashboardEvaluator,
} from '../../src/skill_selection_evaluators';

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

evaluate.describe(
  'Agent Builder Dashboards - Skill Selection',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ fetch }) => {
      await fetch('/api/sample_data/logs', {
        method: 'POST',
        version: '2023-10-31',
      });
    });

    evaluate('dashboards in chat smokescreen', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder dashboards: dashboard skill activation',
          description: 'Checks that dashboard-related skill content is loaded for dashboard asks',
          examples: [
            {
              input: {
                question:
                  'Create a dashboard showing my sample log data. Decide on visualizations and layout.',
              },
              output: {
                expected: 'Dashboard skill should be activated.',
              },
              metadata: {
                debugConversation: true,
              },
            },
          ],
        },
        evaluators: [dashboardSkillActivatedEvaluator],
      });
    });

    evaluate('visualization request does not create dashboard', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder dashboards: visualization without dashboard',
          description:
            'Checks that standalone visualization requests load the visualization skill without loading dashboard management.',
          examples: [
            {
              input: {
                question:
                  'Create a bar chart showing the distribution of response codes in kibana_sample_data_logs.',
              },
              output: {
                expected:
                  'Visualization skill should be activated and dashboard management should not be used.',
              },
              metadata: {
                debugConversation: true,
              },
            },
          ],
        },
        evaluators: [visualizationSkillWithoutDashboardEvaluator],
      });
    });

    evaluate('esql query help does not create dashboard', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder dashboards: esql help without dashboard',
          description:
            'Checks that ES|QL query-writing requests are treated as data exploration, not dashboard composition.',
          examples: [
            {
              input: {
                question: 'Help me write an ES|QL query to find slow transactions',
              },
              output: {
                expected: 'Dashboard management should not be used.',
              },
              metadata: {
                debugConversation: true,
              },
            },
          ],
        },
        evaluators: [dashboardSkillNotActivatedEvaluator],
      });
    });
  }
);
