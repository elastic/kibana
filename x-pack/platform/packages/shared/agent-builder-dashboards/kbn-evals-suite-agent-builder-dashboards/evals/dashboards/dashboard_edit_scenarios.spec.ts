/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { DASHBOARD_EDIT_SCENARIO_EXAMPLES } from './datasets';

evaluate.describe(
  'Agent Builder Dashboards - Edit scenarios',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ fetch }) => {
      await fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' });
    });

    evaluate(
      'edits non-ES|QL panels, controls and sections of a sectioned dashboard',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder dashboards: edit scenarios',
            description:
              'Edits a seeded sectioned logs dashboard: Vega and ML panel config, data-view and Query DSL Vega panels it must not edit silently, controls, an index the cluster does not have, charts from earlier in the conversation, and a section rename. Scores each ask and the layout the edit must keep.',
            examples: DASHBOARD_EDIT_SCENARIO_EXAMPLES,
          },
        });
      }
    );
  }
);
