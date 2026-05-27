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
  dashboardAttachmentExistsEvaluator,
  dashboardAttachmentTitleEvaluator,
  dashboardGridBoundsEvaluator,
  dashboardGridRowLayoutEvaluator,
  dashboardPanelCountEvaluator,
  dashboardSectionShapeEvaluator,
} from '../../src/dashboard_attachment_evaluators';
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
  'Agent Builder Dashboards - Dashboard Management',
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
                expected:
                  'Dashboard skill should create a rich sample logs dashboard with overview metrics, traffic trends, and breakdown/distribution panels.',
                expectedDashboardAttachment: {
                  exists: true,
                  title: { nonEmpty: true },
                  panelCount: { min: 10, max: 20 },
                  grid: { maxColumns: 48, noOverflow: true },
                },
              },
            },
          ],
        },
        evaluators: [
          dashboardSkillActivatedEvaluator,
          dashboardAttachmentExistsEvaluator,
          dashboardAttachmentTitleEvaluator,
          dashboardPanelCountEvaluator,
          dashboardGridBoundsEvaluator,
        ],
      });
    });

    evaluate('dashboard section requests create requested sections', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder dashboards: dashboard section creation',
          description: 'Checks that dashboard section requests create the requested sections',
          examples: [
            {
              input: {
                question:
                  "Create a dashboard using kibana_sample_data_logs with 2 sections: 'Traffic Volume' with a panel showing requests over time, and 'Response Codes' with a panel showing response.keyword distribution.",
              },
              output: {
                expected: 'Dashboard skill should be activated and create the requested sections.',
                expectedDashboardAttachment: {
                  exists: true,
                  title: { nonEmpty: true },
                  panelCount: { min: 2 },
                  sectionCount: 2,
                  sections: [
                    { titleIncludesAny: ['traffic', 'trend', 'time'], minPanels: 1 },
                    { titleIncludesAny: ['response', 'status', 'code'], minPanels: 1 },
                  ],
                  grid: { maxColumns: 48, noOverflow: true },
                },
              },
            },
          ],
        },
        evaluators: [
          dashboardSkillActivatedEvaluator,
          dashboardAttachmentExistsEvaluator,
          dashboardAttachmentTitleEvaluator,
          dashboardPanelCountEvaluator,
          dashboardSectionShapeEvaluator,
          dashboardGridBoundsEvaluator,
        ],
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
                expectedDashboardAttachment: {
                  exists: false,
                },
              },
            },
          ],
        },
        evaluators: [
          visualizationSkillWithoutDashboardEvaluator,
          dashboardAttachmentExistsEvaluator,
        ],
      });
    });

    evaluate('data exploration requests do not create dashboard', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder dashboards: data exploration without dashboard',
          description:
            'Checks that data exploration requests are not treated as dashboard composition.',
          examples: [
            {
              input: {
                question: 'Help me write an ES|QL query to find slow transactions',
              },
              output: {
                expected: 'Dashboard management should not be used.',
                expectedDashboardAttachment: {
                  exists: false,
                },
              },
            },
            {
              input: {
                question: 'What fields are available in the logs-* index?',
              },
              output: {
                expected: 'Dashboard management should not be used for field discovery.',
                expectedDashboardAttachment: {
                  exists: false,
                },
              },
            },
          ],
        },
        evaluators: [dashboardSkillNotActivatedEvaluator, dashboardAttachmentExistsEvaluator],
      });
    });

    evaluate('dashboard grid layout follows row sizing rules', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder dashboards: grid row layout',
          description:
            'Checks that dashboard grid layout follows compact metric row and row-stacking rules.',
          examples: [
            {
              input: {
                question:
                  'Create a dashboard using kibana_sample_data_logs with 6 compact metric panels in one row: total requests, error count, average bytes, unique hosts, 95th percentile bytes, and max memory.',
              },
              output: {
                expected:
                  'Dashboard should contain one compact row of 6 metric-sized panels that fills the 48-column grid.',
                expectedDashboardAttachment: {
                  exists: true,
                  title: { nonEmpty: true },
                  grid: {
                    maxColumns: 48,
                    noOverflow: true,
                    rows: [
                      {
                        panelCount: 6,
                        widthRange: { min: 8, max: 10 },
                        heightRange: { min: 5, max: 6 },
                        fillsWidth: true,
                      },
                    ],
                  },
                },
              },
            },
            {
              input: {
                question:
                  'Create a dashboard using kibana_sample_data_logs with 4 KPI metric panels across the top row and one full-width time series panel directly below them.',
              },
              output: {
                expected:
                  'Dashboard should place 4 compact metric panels in the top row and a full-width trend panel in the next row.',
                expectedDashboardAttachment: {
                  exists: true,
                  title: { nonEmpty: true },
                  grid: {
                    maxColumns: 48,
                    noOverflow: true,
                    rows: [
                      {
                        panelCount: 4,
                        widthRange: { min: 8, max: 16 },
                        heightRange: { min: 5, max: 6 },
                        fillsWidth: true,
                      },
                      {
                        panelCount: 1,
                        widths: [48],
                        yAfterPreviousRow: true,
                        fillsWidth: true,
                      },
                    ],
                  },
                },
              },
            },
          ],
        },
        evaluators: [
          dashboardSkillActivatedEvaluator,
          dashboardAttachmentExistsEvaluator,
          dashboardAttachmentTitleEvaluator,
          dashboardGridBoundsEvaluator,
          dashboardGridRowLayoutEvaluator,
        ],
      });
    });
  }
);
