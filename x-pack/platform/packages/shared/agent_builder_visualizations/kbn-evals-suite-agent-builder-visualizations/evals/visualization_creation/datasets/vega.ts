/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationDatasetExample } from '../../../src/evaluate_dataset';
import { TIME_BUCKET_COLUMN, timeSeriesQuery, totalsQuery } from './factories';
import { GOLDEN_TOOL_PATH } from './golden_tool_path';

/** Vega-Lite path: forms Lens does not express. */
export const VEGA_EXAMPLES: VisualizationDatasetExample[] = [
  // Vega path: request a form Lens does not express (scatter with size).
  // Prompt is unranked, so gold must not SORT before LIMIT. The kept rows are then
  // arbitrary, so ES|QL Result Equivalence skips this example.
  {
    input: {
      question:
        'Create a Vega-Lite scatter plot of average bytes vs request count by client IP in kibana_sample_data_logs, with point size encoding the number of unique URLs.',
    },
    metadata: { chartFamily: 'vega', dataSource: 'logs' },
    output: {
      renderer: 'vega',
      config: {
        data_source: {
          type: 'esql',
          query: `FROM kibana_sample_data_logs
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
  // Vega time series: bars and a line over a shared time axis. The gold follows the
  // shared time-series idiom (TBUCKET, no timestamp WHERE), as Lens does.
  {
    input: {
      question:
        'Create a Vega-Lite layered chart of kibana_sample_data_logs over time, with request count as bars and average bytes as a line on a second y axis.',
    },
    metadata: { chartFamily: 'vega', dataSource: 'logs' },
    output: {
      renderer: 'vega',
      config: {
        data_source: {
          type: 'esql',
          query: timeSeriesQuery({
            index: 'kibana_sample_data_logs',
            metrics: [
              { alias: 'Request Count', expression: 'COUNT(*)' },
              { alias: 'Average Bytes', expression: 'AVG(bytes)' },
            ],
          }),
        },
        spec: {
          layer: [
            {
              mark: 'bar',
              encoding: {
                x: { field: TIME_BUCKET_COLUMN },
                y: { field: 'Request Count' },
              },
            },
            {
              mark: 'line',
              encoding: {
                x: { field: TIME_BUCKET_COLUMN },
                y: { field: 'Average Bytes' },
              },
            },
          ],
        },
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
  // Vega single number on a source without @timestamp: Kibana cannot apply the time
  // picker on its own, so the gold filters order_date with the time-picker params.
  // The gold pins only the mark: a number with a label layer is just as valid as a
  // single text mark, and Column Binding Integrity checks the bound column.
  {
    input: {
      question:
        'Create a Vega-Lite chart showing the total number of orders in kibana_sample_data_ecommerce as a single large number.',
    },
    metadata: { chartFamily: 'vega', dataSource: 'ecommerce' },
    output: {
      renderer: 'vega',
      config: {
        data_source: {
          type: 'esql',
          query: totalsQuery({
            index: 'kibana_sample_data_ecommerce',
            metrics: [{ alias: 'Order Count', expression: 'COUNT(*)' }],
            timeField: 'order_date',
          }),
        },
        spec: { mark: 'text' },
      },
      goldenToolPath: GOLDEN_TOOL_PATH,
    },
  },
];
