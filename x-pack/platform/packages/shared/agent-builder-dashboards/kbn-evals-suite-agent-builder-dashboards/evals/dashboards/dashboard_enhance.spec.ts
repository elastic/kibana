/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { DASHBOARD_ENHANCE_EXAMPLES } from './datasets';

evaluate.describe('Agent Builder Dashboards - Enhance', { tag: tags.serverless.search }, () => {
  evaluate.beforeAll(async ({ fetch }) => {
    await fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' });
  });

  evaluate('enhances a seeded dashboard in the requested mode', async ({ evaluateDataset }) => {
    await evaluateDataset({
      dataset: {
        name: 'agent builder dashboards: enhance',
        description:
          'A seeded logs dashboard with declared defects, enhanced in appearance or content mode. Scores the mode question, mode compliance, defect resolution, layout rules, and composition order.',
        examples: DASHBOARD_ENHANCE_EXAMPLES,
      },
    });
  });
});
