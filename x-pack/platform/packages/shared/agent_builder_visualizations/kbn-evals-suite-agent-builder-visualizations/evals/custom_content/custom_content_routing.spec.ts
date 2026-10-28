/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { CUSTOM_CONTENT_ROUTING_EXAMPLES } from './datasets/custom_content_routing';

evaluate.describe(
  'Agent Builder Visualizations - Custom Content Routing',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ fetch }) => {
      await Promise.all([
        fetch('/api/sample_data/logs', { method: 'POST', version: '2023-10-31' }),
        fetch('/api/sample_data/flights', { method: 'POST', version: '2023-10-31' }),
      ]);
    });

    evaluate(
      'chooses custom content only when it is needed',
      async ({ evaluateRoutingDataset }) => {
        await evaluateRoutingDataset({
          dataset: {
            name: 'agent builder visualizations: custom content routing',
            description:
              'Requests that never say "custom panel": status boards, scorecards and narrative text around live values, which only an HTML layout can express, and line, pie, table and metric requests, which should stay in a chart. Scored on the renderer the agent asked for.',
            examples: CUSTOM_CONTENT_ROUTING_EXAMPLES,
          },
        });
      }
    );
  }
);
