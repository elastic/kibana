/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { CUSTOM_CONTENT_EXAMPLES } from './datasets/custom_content';

evaluate.describe(
  'Agent Builder Visualizations - Custom Content',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ fetch }) => {
      await Promise.all([
        fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' }),
        fetch('/api/sample_data/flights', { method: 'POST', version: '2023-10-31' }),
      ]);
    });

    evaluate(
      'creates and edits custom content panels',
      async ({ evaluateCustomContentDataset }) => {
        await evaluateCustomContentDataset({
          dataset: {
            name: 'agent builder visualizations: custom content',
            description:
              'Custom panels over kibana_sample_data_logs and kibana_sample_data_flights: status cards, a funnel, a flow, a ranking, KPIs, a user-supplied query, static panels, and two-turn style and data edits. Scored from the stored panel: template validity, a query only when the panel has data, an executable query that is not truncated by the chart default, rows in the requested order, template columns bound to the query, and edits that keep or change the query as asked.',
            examples: CUSTOM_CONTENT_EXAMPLES,
          },
        });
      }
    );
  }
);
