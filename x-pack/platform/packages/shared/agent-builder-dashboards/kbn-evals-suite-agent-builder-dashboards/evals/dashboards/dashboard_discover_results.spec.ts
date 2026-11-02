/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { DASHBOARD_DISCOVER_RESULTS_EXAMPLES } from './datasets';

evaluate.describe(
  'Agent Builder Dashboards - Discover Results',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ fetch }) => {
      await fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' });
    });

    evaluate(
      'builds dashboards from DISSECT results with controls on mapped fields only',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder dashboards: discover results',
            description:
              'Dashboard requests over Discover ES|QL results that parse kibana_sample_data_logs with DISSECT. Scores control sourcing (mapped fields only, user_requested flag, plain-words failure reporting), plus routing, structure, and the layout and chart rules.',
            examples: DASHBOARD_DISCOVER_RESULTS_EXAMPLES,
          },
        });
      }
    );
  }
);
