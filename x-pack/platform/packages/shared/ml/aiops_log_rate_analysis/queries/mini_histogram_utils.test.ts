/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { NumericChartData } from '@kbn/ml-agg-utils';

import { getDateHistogramBuckets } from '../__mocks__/date_histogram';
import { paramsMock } from './__mocks__/params_match_all';
import {
  getMiniHistogramAgg,
  getMiniHistogramDataFromAggResponse,
  type MiniHistogramAgg,
} from './mini_histogram_utils';

describe('getMiniHistogramAgg', () => {
  it('returns DSL for a mini histogram aggregation', () => {
    expect(getMiniHistogramAgg(paramsMock)).toStrictEqual({
      mini_histogram: {
        histogram: {
          extended_bounds: {
            max: 50,
            min: 0,
          },
          field: 'the-time-field-name',
          interval: 2.6315789473684212,
          min_doc_count: 0,
        },
      },
    });
  });
});

describe('getMiniHistogramDataFromAggResponse', () => {
  it('returns data for a mini histogram chart', () => {
    // overall time series mock
    const numericChartDataMock: NumericChartData['data'] = Object.entries(
      getDateHistogramBuckets()
    ).map(([key, value]) => ({
      doc_count: value,
      key: parseInt(key, 10),
      key_as_string: new Date(parseInt(key, 10)).toISOString(),
    }));

    // aggregation response mock
    const aggResponseMock: Record<string, MiniHistogramAgg> = {
      mini_histogram_0: {
        doc_count: 0,
        mini_histogram: {
          buckets: Object.entries(getDateHistogramBuckets()).map(([key, value]) => ({
            doc_count: Math.round(value / 10),
            key: parseInt(key, 10),
            key_as_string: new Date(parseInt(key, 10)).toISOString(),
          })),
        },
      },
    };

    // we'll only check the first element to the returned array to avoid a large snapshot
    expect(
      getMiniHistogramDataFromAggResponse(numericChartDataMock, aggResponseMock, 0)[0]
    ).toStrictEqual({
      // response should correctly calculate values based on the overall time series and the aggregation response
      doc_count_overall: 4436,
      doc_count_significant_item: 493,
      key: 1654566600000,
      key_as_string: '2022-06-07T01:50:00.000Z',
    });
  });
});
