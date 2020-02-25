/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESAggMetricField } from './es_agg_field';
import { METRIC_TYPE } from '../../../common/constants';

describe('supportsFieldMeta', () => {
  test('Non-counting aggregations should support field meta', () => {
    const avgMetric = new ESAggMetricField({ aggType: METRIC_TYPE.AVG });
    expect(avgMetric.supportsFieldMeta()).toBe(true);
    const maxMetric = new ESAggMetricField({ aggType: METRIC_TYPE.MAX });
    expect(maxMetric.supportsFieldMeta()).toBe(true);
    const minMetric = new ESAggMetricField({ aggType: METRIC_TYPE.MIN });
    expect(minMetric.supportsFieldMeta()).toBe(true);
  });

  test('Counting aggregations should not support field meta', () => {
    const countMetric = new ESAggMetricField({ aggType: METRIC_TYPE.COUNT });
    expect(countMetric.supportsFieldMeta()).toBe(false);
    const sumMetric = new ESAggMetricField({ aggType: METRIC_TYPE.SUM });
    expect(sumMetric.supportsFieldMeta()).toBe(false);
    const uniqueCountMetric = new ESAggMetricField({ aggType: METRIC_TYPE.UNIQUE_COUNT });
    expect(uniqueCountMetric.supportsFieldMeta()).toBe(false);
  });
});
