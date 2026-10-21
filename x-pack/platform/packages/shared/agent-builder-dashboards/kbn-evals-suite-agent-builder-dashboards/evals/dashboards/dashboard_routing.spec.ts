/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { DASHBOARD_ROUTING_EXAMPLES } from './datasets';

evaluate.describe('Agent Builder Dashboards - Routing', { tag: tags.serverless.search }, () => {
  evaluate.beforeAll(async ({ fetch }) => {
    await fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' });
  });

  evaluate(
    'keeps non-dashboard requests out of the dashboard skill',
    async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder dashboards: routing',
          description:
            'Standalone chart, ES|QL help, and field discovery requests. Scored by Dashboard Skill Routing; dashboard evaluators skip.',
          examples: DASHBOARD_ROUTING_EXAMPLES,
        },
      });
    }
  );
});
