/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { VISUALIZATION_EDIT_EXAMPLES } from './datasets';

evaluate.describe(
  'Agent Builder Visualizations - Iterative Edits',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ fetch }) => {
      await Promise.all([
        fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' }),
        fetch('/api/sample_data/ecommerce', { method: 'POST', version: '2023-10-31' }),
      ]);
    });

    evaluate('applies a follow-up edit to an existing chart', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder visualizations: iterative edits',
          description:
            'Two-turn conversations: create a chart, then change it (orientation, breakdown, chart type, extra series). The edited chart is scored against a gold Config API partial.',
          examples: VISUALIZATION_EDIT_EXAMPLES,
        },
      });
    });
  }
);
