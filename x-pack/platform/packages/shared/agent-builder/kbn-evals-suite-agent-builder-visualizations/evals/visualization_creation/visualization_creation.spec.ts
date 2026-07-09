/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';

evaluate.describe(
  'Agent Builder Visualizations - Standalone Visualization Creation',
  { tag: tags.serverless.search },
  () => {
    // The sample logs index is what makes the execution evaluator meaningful:
    // without real data, every generated query would hit
    // `verification_exception` and score 0 regardless of the model's quality.
    evaluate.beforeAll(async ({ fetch }) => {
      await fetch('/api/sample_data/logs', {
        method: 'POST',
        version: '2023-10-31',
      });
    });

    evaluate('standalone visualization ES|QL generation', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder visualizations: standalone visualization creation',
          description:
            'Standalone visualization requests over kibana_sample_data_logs. Checks the ES|QL backing each generated visualization is syntactically valid, executes against real data, and is equivalent to the ground-truth query.',
          examples: [
            {
              input: {
                question:
                  'Create a bar chart of the number of requests by response code in kibana_sample_data_logs.',
              },
              output: {
                expected:
                  'A bar chart backed by ES|QL that counts documents grouped by the response code field.',
                query: `FROM kibana_sample_data_logs
| STATS request_count = COUNT(*) BY response.keyword
| SORT request_count DESC`,
                goldenToolPath: ['load_skill', 'platform.core.create_visualization'],
              },
              metadata: { includeHitDetection: true },
            },
            {
              input: {
                question:
                  'Create a single metric visualization showing the total number of requests in kibana_sample_data_logs.',
              },
              output: {
                expected:
                  'A single metric visualization backed by ES|QL that counts all documents.',
                query: `FROM kibana_sample_data_logs
| STATS total_requests = COUNT(*)`,
                goldenToolPath: ['load_skill', 'platform.core.create_visualization'],
              },
              metadata: { includeHitDetection: true },
            },
            {
              input: {
                question:
                  'Create a line chart of total bytes over time in kibana_sample_data_logs.',
              },
              output: {
                expected:
                  'A time-series visualization backed by ES|QL that sums the bytes field bucketed by time.',
                query: `FROM kibana_sample_data_logs
| STATS total_bytes = SUM(bytes) BY bucket = BUCKET(@timestamp, 1 day)
| SORT bucket ASC`,
                goldenToolPath: ['load_skill', 'platform.core.create_visualization'],
              },
              metadata: { includeHitDetection: true },
            },
          ],
        },
      });
    });
  }
);
