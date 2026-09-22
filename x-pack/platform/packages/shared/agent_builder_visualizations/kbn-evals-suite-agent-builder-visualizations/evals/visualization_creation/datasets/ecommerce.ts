/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { VisualizationDatasetExample } from '../../../src/evaluate_dataset';
import { GOLDEN_TOOL_PATH } from './golden_tool_path';

/** kibana_sample_data_ecommerce: metric, pie, and xy over order_date and revenue fields. */
export const ECOMMERCE_EXAMPLES: VisualizationDatasetExample[] = [
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
];
