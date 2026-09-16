/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { tags } from '@kbn/evals';
import { evaluate } from '../../src/evaluate';
import { cleanHostLoadMetrics, seedHostLoadMetrics } from '../../src/fixtures/host_load_metrics';
import { HOST_METRICS_EXAMPLE } from './host_metrics_example';

const GOLDEN_TOOL_PATH = ['load_skill', 'platform.core.create_visualization'];

evaluate.describe(
  'Agent Builder Visualizations - Standalone Visualization Creation',
  { tag: tags.serverless.search },
  () => {
    evaluate.beforeAll(async ({ fetch, esClient, log }) => {
      await Promise.all([
        fetch('/api/sample_data/logs', {
          method: 'POST',
          version: '2023-10-31',
        }),
        fetch('/api/sample_data/ecommerce', {
          method: 'POST',
          version: '2023-10-31',
        }),
        seedHostLoadMetrics(esClient, log),
      ]);
    });

    evaluate.afterAll(async ({ esClient, log }) => {
      await cleanHostLoadMetrics(esClient, log);
    });

    evaluate('standalone visualization ES|QL generation', async ({ evaluateDataset }) => {
      await evaluateDataset({
        dataset: {
          name: 'agent builder visualizations: standalone visualization creation',
          description:
            'Standalone visualization requests over kibana_sample_data_logs, kibana_sample_data_ecommerce, and host metrics. Scores ES|QL validity/equivalence, chart type vs intent, config vs intent, config validity, and result shape.',
          examples: [
            // --- logs: core chart types ---
            {
              input: {
                question:
                  'Create a bar chart of the number of requests by response code in kibana_sample_data_logs.',
              },
              output: {
                config: {
                  type: 'xy',
                  layers: [
                    {
                      type: ['bar', 'bar_horizontal'],
                      data_source: {
                        type: 'esql',
                        query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY response.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
                      },
                      x: { column: 'response.keyword' },
                      y: [{ column: 'Request Count' }],
                    },
                  ],
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a single metric visualization showing the total number of requests in kibana_sample_data_logs.',
              },
              output: {
                config: {
                  type: 'metric',
                  data_source: {
                    type: 'esql',
                    query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Total Requests\` = COUNT(*)`,
                  },
                  metrics: [{ column: 'Total Requests' }],
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a line chart of total bytes over time in kibana_sample_data_logs.',
              },
              output: {
                config: {
                  type: 'xy',
                  layers: [
                    {
                      type: 'line',
                      data_source: {
                        type: 'esql',
                        query: `FROM kibana_sample_data_logs
| STATS \`Total Bytes\` = SUM(bytes) BY \`Time Bucket\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
                      },
                      x: { column: 'Time Bucket' },
                      y: [{ column: 'Total Bytes' }],
                    },
                  ],
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a pie chart of request counts by response code in kibana_sample_data_logs.',
              },
              output: {
                config: {
                  type: 'pie',
                  data_source: {
                    type: 'esql',
                    query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY response.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
                  },
                  metrics: [{ column: 'Request Count' }],
                  group_by: [{ column: 'response.keyword' }],
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a horizontal bar chart of the top operating systems by request count in kibana_sample_data_logs.',
              },
              output: {
                config: {
                  type: 'xy',
                  layers: [
                    {
                      type: 'bar_horizontal',
                      data_source: {
                        type: 'esql',
                        query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY machine.os.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
                      },
                      x: { column: 'machine.os.keyword' },
                      y: [{ column: 'Request Count' }],
                    },
                  ],
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a tag cloud of file extensions by request count in kibana_sample_data_logs.',
              },
              output: {
                config: {
                  type: 'tag_cloud',
                  data_source: {
                    type: 'esql',
                    query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY extension.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
                  },
                  metric: { column: 'Request Count' },
                  tag_by: { column: 'extension.keyword' },
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a data table of the top 10 URLs by request count in kibana_sample_data_logs, including total bytes for each URL.',
              },
              output: {
                config: {
                  type: 'data_table',
                  data_source: {
                    type: 'esql',
                    query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*), \`Total Bytes\` = SUM(bytes) BY url.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
                  },
                  rows: [{ column: 'url.keyword' }],
                  metrics: [{ column: 'Request Count' }, { column: 'Total Bytes' }],
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a heatmap of request counts by hour of day and response code in kibana_sample_data_logs.',
              },
              output: {
                config: {
                  type: 'heatmap',
                  data_source: {
                    type: 'esql',
                    query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| EVAL hour = DATE_EXTRACT("HOUR_OF_DAY", @timestamp)
| STATS \`Request Count\` = COUNT(*) BY hour, response.keyword`,
                  },
                  x: { column: 'hour' },
                  y: { column: 'response.keyword' },
                  metric: { column: 'Request Count' },
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question: 'Create a treemap of request counts by host in kibana_sample_data_logs.',
              },
              output: {
                config: {
                  type: 'treemap',
                  data_source: {
                    type: 'esql',
                    query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*) BY host.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`,
                  },
                  metrics: [{ column: 'Request Count' }],
                  group_by: [{ column: 'host.keyword' }],
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question: 'Show average bytes per request as a gauge for kibana_sample_data_logs.',
              },
              output: {
                config: {
                  type: 'gauge',
                  data_source: {
                    type: 'esql',
                    query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Average Bytes\` = AVG(bytes)`,
                  },
                  metric: { column: 'Average Bytes' },
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a line chart of request count and average bytes over time in kibana_sample_data_logs as two series.',
              },
              output: {
                // Multi-series over time is valid as Lens xy or Vega; score ES|QL
                // equivalence rather than forcing a single renderer/chart_type.
                config: {
                  data_source: {
                    type: 'esql',
                    query: `FROM kibana_sample_data_logs
| STATS \`Request Count\` = COUNT(*), \`Average Bytes\` = AVG(bytes) BY \`Time Bucket\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend)`,
                  },
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },

            // --- ecommerce: multi-value numeric schema ---
            {
              input: {
                question:
                  'Create a metric visualization of total revenue (taxful_total_price) in kibana_sample_data_ecommerce.',
              },
              output: {
                config: {
                  type: 'metric',
                  data_source: {
                    type: 'esql',
                    query: `FROM kibana_sample_data_ecommerce
| WHERE order_date >= ?_tstart AND order_date < ?_tend
| STATS \`Total Revenue\` = SUM(taxful_total_price)`,
                  },
                  metrics: [{ column: 'Total Revenue' }],
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a pie chart of order counts by category in kibana_sample_data_ecommerce.',
              },
              output: {
                config: {
                  type: 'pie',
                  data_source: {
                    type: 'esql',
                    query: `FROM kibana_sample_data_ecommerce
| WHERE order_date >= ?_tstart AND order_date < ?_tend
| STATS \`Order Count\` = COUNT(*) BY category.keyword
| SORT \`Order Count\` DESC
| LIMIT 10`,
                  },
                  metrics: [{ column: 'Order Count' }],
                  group_by: [{ column: 'category.keyword' }],
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a line chart of total revenue over time in kibana_sample_data_ecommerce.',
              },
              output: {
                config: {
                  type: 'xy',
                  layers: [
                    {
                      type: 'line',
                      data_source: {
                        type: 'esql',
                        query: `FROM kibana_sample_data_ecommerce
| STATS \`Total Revenue\` = SUM(taxful_total_price) BY \`Time Bucket\` = BUCKET(order_date, 75, ?_tstart, ?_tend)`,
                      },
                      x: { column: 'Time Bucket' },
                      y: [{ column: 'Total Revenue' }],
                    },
                  ],
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
            {
              input: {
                question:
                  'Create a bar chart of total quantity sold by manufacturer in kibana_sample_data_ecommerce.',
              },
              output: {
                config: {
                  type: 'xy',
                  layers: [
                    {
                      type: ['bar', 'bar_horizontal'],
                      data_source: {
                        type: 'esql',
                        query: `FROM kibana_sample_data_ecommerce
| WHERE order_date >= ?_tstart AND order_date < ?_tend
| STATS \`Total Quantity\` = SUM(total_quantity) BY manufacturer.keyword
| SORT \`Total Quantity\` DESC
| LIMIT 10`,
                      },
                      x: { column: 'manufacturer.keyword' },
                      y: [{ column: 'Total Quantity' }],
                    },
                  ],
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },

            // Host metrics from the synthtrace Beats load fixture.
            HOST_METRICS_EXAMPLE,

            // Vega path: request a form Lens does not express (scatter with size).
            // Prompt is unranked, so gold must not SORT before LIMIT.
            {
              input: {
                question:
                  'Create a Vega-Lite scatter plot of average bytes vs request count by client IP in kibana_sample_data_logs, with point size encoding the number of unique URLs.',
              },
              output: {
                renderer: 'vega',
                config: {
                  data_source: {
                    type: 'esql',
                    query: `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Average Bytes\` = AVG(bytes), \`Request Count\` = COUNT(*), \`Unique URLs\` = COUNT_DISTINCT(url.keyword) BY clientip
| LIMIT 100`,
                  },
                  spec: {
                    mark: 'point',
                    encoding: {
                      x: { field: 'Average Bytes' },
                      y: { field: 'Request Count' },
                      size: { field: 'Unique URLs' },
                    },
                  },
                },
                goldenToolPath: GOLDEN_TOOL_PATH,
              },
            },
          ],
        },
      });
    });
  }
);
