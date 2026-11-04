/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { VISUALIZATION_REFUSAL_EXAMPLES } from './datasets';

evaluate.describe(
  'Agent Builder Visualizations - Refusals',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ fetch }) => {
      // Sample logs are installed so "missing field" is a real absence, not a missing index.
      await fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' });
    });

    evaluate('declines requests it cannot draw', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder visualizations: refusals',
          description:
            'Requests the agent should decline or push back on: missing index, missing field, ambiguous ask. Scored by Visualization Refusal; positive-only evaluators skip.',
          examples: VISUALIZATION_REFUSAL_EXAMPLES,
        },
      });
    });
  }
);
