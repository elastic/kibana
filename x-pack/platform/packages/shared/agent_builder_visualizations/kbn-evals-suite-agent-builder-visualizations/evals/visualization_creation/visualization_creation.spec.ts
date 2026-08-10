/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import {
  cleanVisualizationDataStreams,
  replayVisualizationDataStreams,
  type LoadResult,
} from '../../src/fixtures/replay';

const GOLDEN_TOOL_PATH = ['load_skill', 'platform.core.create_visualization'];

evaluate.describe(
  'Agent Builder Visualizations - Standalone Visualization Creation',
  { tag: tags.serverless.search },
  () => {
    let replayResult: LoadResult;

    evaluate.beforeAll(async ({ fetch, esClient, log }) => {
      await fetch('/api/sample_data/logs', {
        method: 'POST',
        version: '2023-10-31',
      });
      replayResult = await replayVisualizationDataStreams(esClient, log);
    });

    evaluate.afterAll(async ({ esClient, log }) => {
      await cleanVisualizationDataStreams(esClient, replayResult, log);
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
                query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY response.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
                chartType: 'xy',
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a single metric visualization showing the total number of requests in kibana_sample_data_logs.',
              },
              output: {
                query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Total Requests\` = COUNT(*)`,
                chartType: 'metric',
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a line chart of total bytes over time in kibana_sample_data_logs.',
              },
              output: {
                query: `FROM kibana_sample_data_logs
| STATS \`Total Bytes\` = SUM(bytes) BY \`Time Bucket\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
                chartType: 'xy',
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            // Host metrics from the GCS otel-demo snapshot: Beats system load data stream
            // (`metrics-system.load-default` / `system.load.{1,5,15}`), not OTel hostmetrics
            // `system.cpu.load_average.*` gauges.
            {
              input: {
                question:
                  'Show CPU load average metrics over time as a line chart. Include system.load.1 (1-minute), system.load.5 (5-minute), and system.load.15 (15-minute) as separate lines, bucketed by auto time interval.',
              },
              output: {
                query: `FROM metrics-system.load-default
| STATS \`1-Minute Load\` = AVG(\`system.load.1\`), \`5-Minute Load\` = AVG(\`system.load.5\`), \`15-Minute Load\` = AVG(\`system.load.15\`) BY \`Time Bucket\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
                chartType: 'xy',
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
          ],
        },
      });
    });
  }
);
