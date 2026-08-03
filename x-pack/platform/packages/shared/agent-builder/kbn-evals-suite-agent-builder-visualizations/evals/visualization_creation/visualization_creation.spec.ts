/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { cleanupOtelMetricsFixtures, setupOtelMetricsFixtures } from '../../src/fixtures/setup';

evaluate.describe(
  'Agent Builder Visualizations - Standalone Visualization Creation',
  { tag: tags.serverless.search },
  () => {
    // The sample logs index is what makes the execution evaluator meaningful:
    // without real data, every generated query would hit
    // `verification_exception` and score 0 regardless of the model's quality.
    // The OTel TSDB fixture backs the `TS`-based CPU-load examples below with
    // real time-series data so their execution / validity signals are
    // meaningful. Fixture setup is hard-failing on purpose (see setup.ts).
    evaluate.beforeAll(async ({ fetch, esClient, log }) => {
      await fetch('/api/sample_data/logs', {
        method: 'POST',
        version: '2023-10-31',
      });
      await setupOtelMetricsFixtures({ esClient, log });
    });

    evaluate.afterAll(async ({ esClient, log }) => {
      await cleanupOtelMetricsFixtures({ esClient, log });
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
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY response.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
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
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Total Requests\` = COUNT(*)`,
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
| STATS \`Total Bytes\` = SUM(bytes) BY \`Time Bucket\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
                goldenToolPath: ['load_skill', 'platform.core.create_visualization'],
              },
              metadata: { includeHitDetection: true },
            },
            // Regression for the OTel host-metrics failure captured in
            // dashboard-level evals (see src/fixtures): the agent must emit a
            // `TS` query that quotes the `.1m` / `.5m` / `.15m` field paths
            // (unquoted, `.1m` is lexed as a numeric literal and the parse
            // fails) and wraps each gauge in an `AVG_OVER_TIME` inner
            // aggregation. Backed by the `metrics-hostmetricsreceiver.otel-default`
            // TSDB fixture so execution / validity are meaningful.
            {
              input: {
                question:
                  'Show CPU load average metrics over time as a line chart. Include system.cpu.load_average.1m (1-minute), system.cpu.load_average.5m (5-minute), and system.cpu.load_average.15m (15-minute) as separate lines, bucketed by auto time interval.',
              },
              output: {
                expected:
                  'A time-series line chart backed by a TS ES|QL query that averages each CPU load-average gauge (1m, 5m, 15m) over time buckets, with the dotted field paths quoted so they are not misparsed as numeric literals.',
                query: `TS metrics-hostmetricsreceiver.otel-default
| STATS \`1-Minute Load Average\` = AVG(AVG_OVER_TIME(\`system.cpu.load_average.1m\`)), \`5-Minute Load Average\` = AVG(AVG_OVER_TIME(\`system.cpu.load_average.5m\`)), \`15-Minute Load Average\` = AVG(AVG_OVER_TIME(\`system.cpu.load_average.15m\`)) BY \`Time Bucket\` = TBUCKET(75, ?_tstart, ?_tend)`,
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
