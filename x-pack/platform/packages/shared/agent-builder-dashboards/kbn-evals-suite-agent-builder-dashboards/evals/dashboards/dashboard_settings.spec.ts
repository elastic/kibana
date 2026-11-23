/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { DASHBOARD_SETTINGS_EXAMPLES } from './datasets';

evaluate.describe('Agent Builder Dashboards - Settings', { tag: tags.serverless.search }, () => {
  evaluate.beforeAll(async ({ fetch }) => {
    await fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' });
  });

  evaluate('changes only the dashboard settings the prompt names', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'agent builder dashboards: settings',
        description:
          'Hides panel borders, sets auto-refresh and turns on fast mode on a seeded sectioned logs dashboard, and renames it without touching any setting. Scores the requested setting, the settings that must keep their seed values, and the layout the change must keep.',
        examples: DASHBOARD_SETTINGS_EXAMPLES,
      },
    });
  });
});
