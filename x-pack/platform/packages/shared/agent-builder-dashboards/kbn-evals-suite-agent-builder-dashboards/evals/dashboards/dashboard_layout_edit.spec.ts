/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { DASHBOARD_LAYOUT_EDIT_EXAMPLES } from './datasets';

evaluate.describe('Agent Builder Dashboards - Layout edit', { tag: tags.serverless.search }, () => {
  evaluate.beforeAll(async ({ fetch }) => {
    await fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' });
  });

  evaluate(
    'edits a sectioned dashboard and keeps the rest of the layout',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder dashboards: layout edit',
          description:
            'Adds, removes, moves and restyles panels and sections of a seeded sectioned logs dashboard. Scores what changed against what the prompt asked, the containers that must keep their grids, the outer order, and the layout rules.',
          examples: DASHBOARD_LAYOUT_EDIT_EXAMPLES,
        },
      });
    }
  );
});
