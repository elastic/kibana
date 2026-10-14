/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { DASHBOARD_CREATION_EXAMPLES } from './datasets';

evaluate.describe(
  'Agent Builder Dashboards - Dashboard Creation',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ fetch }) => {
      await fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' });
    });

    evaluate(
      'creates dashboards that follow the layout and composition rules',
      async ({ evaluateDataset }) => {
        await evaluateDataset({
          dataset: {
            name: 'agent builder dashboards: dashboard creation',
            description:
              'Dashboard requests over kibana_sample_data_logs. Scores skill routing, the structure the prompt pins down, layout rules, and composition order.',
            examples: DASHBOARD_CREATION_EXAMPLES,
          },
        });
      }
    );
  }
);
