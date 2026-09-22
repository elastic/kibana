/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { categoricalQuery, timeSeriesQuery, totalsQuery, xyExample } from './factories';
import { GOLDEN_TOOL_PATH } from './golden_tool_path';

const REQUEST_COUNT = { alias: 'Request Count', expression: 'COUNT(*)' };
const TOTAL_BYTES = { alias: 'Total Bytes', expression: 'SUM(bytes)' };

describe('gold query factories', () => {
  it('builds a top-N categorical query in the agent idiom', () => {
    expect(
      categoricalQuery({
        index: 'kibana_sample_data_logs',
        metrics: [REQUEST_COUNT, TOTAL_BYTES],
        groupBy: 'url.keyword',
      })
    ).toBe(`FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*), \`Total Bytes\` = SUM(bytes) BY url.keyword
| SORT \`Request Count\` DESC
| LIMIT 10`);
  });

  it('builds an auto-bucket time series over a custom time field', () => {
    expect(
      timeSeriesQuery({
        index: 'kibana_sample_data_ecommerce',
        metrics: [{ alias: 'Total Revenue', expression: 'SUM(taxful_total_price)' }],
        timeField: 'order_date',
      })
    ).toBe(`FROM kibana_sample_data_ecommerce
| STATS \`Total Revenue\` = SUM(taxful_total_price) BY \`Time Bucket\` = BUCKET(order_date, 75, ?_tstart, ?_tend)`);
  });

  it('builds a single-row totals query', () => {
    expect(totalsQuery({ index: 'kibana_sample_data_logs', metrics: [REQUEST_COUNT] })).toBe(
      `FROM kibana_sample_data_logs
| WHERE @timestamp >= ?_tstart AND @timestamp < ?_tend
| STATS \`Request Count\` = COUNT(*)`
    );
  });
});

describe('xyExample', () => {
  it('nests the query in the layer data_source and binds x and y columns', () => {
    const example = xyExample({
      question: 'q',
      seriesType: ['bar', 'bar_horizontal'],
      query: 'FROM a',
      x: 'response.keyword',
      y: ['Request Count'],
    });

    expect(example).toEqual({
      input: { question: 'q' },
      output: {
        config: {
          type: 'xy',
          layers: [
            {
              type: ['bar', 'bar_horizontal'],
              data_source: { type: 'esql', query: 'FROM a' },
              x: { column: 'response.keyword' },
              y: [{ column: 'Request Count' }],
            },
          ],
        },
        goldenToolPath: GOLDEN_TOOL_PATH,
      },
    });
  });
});
