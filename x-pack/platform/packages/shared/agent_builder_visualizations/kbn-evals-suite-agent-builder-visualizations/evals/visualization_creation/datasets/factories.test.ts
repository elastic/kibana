/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  categoricalQuery,
  metricExample,
  timeSeriesQuery,
  totalsQuery,
  xyExample,
} from './factories';
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

  it('appends a split column to the time series BY clause', () => {
    expect(
      timeSeriesQuery({
        index: 'kibana_sample_data_logs',
        metrics: [REQUEST_COUNT],
        splitBy: 'response.keyword',
      })
    ).toBe(`FROM kibana_sample_data_logs
| STATS \`Request Count\` = COUNT(*) BY \`Time Bucket\` = BUCKET(@timestamp, 75, ?_tstart, ?_tend), response.keyword`);
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
      metadata: { chartFamily: 'xy' },
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

  it('adds breakdown_by and records breakdown and multi-series features', () => {
    const example = xyExample({
      question: 'q',
      seriesType: 'line',
      query: 'FROM a',
      x: 'Time Bucket',
      y: ['a', 'b'],
      breakdownBy: 'response.keyword',
    });

    expect(example.metadata).toEqual({
      chartFamily: 'xy',
      configFeatures: ['breakdown_by', 'multi_series'],
    });
    expect(example.output?.config).toEqual(
      expect.objectContaining({
        layers: [expect.objectContaining({ breakdown_by: { column: 'response.keyword' } })],
      })
    );
  });
});

describe('metricExample', () => {
  it('records secondary metric and breakdown features in metadata', () => {
    const example = metricExample({
      question: 'q',
      query: 'FROM a',
      metrics: ['Total', 'Count'],
      breakdownBy: 'os',
    });

    expect(example.metadata).toEqual({
      chartFamily: 'metric',
      configFeatures: ['breakdown_by', 'secondary_metric'],
    });
    expect(example.output?.config).toEqual(
      expect.objectContaining({
        metrics: [
          { type: 'primary', column: 'Total' },
          { type: 'secondary', column: 'Count' },
        ],
        breakdown_by: { column: 'os' },
      })
    );
  });
});
