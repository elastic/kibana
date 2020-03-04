/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { ESAggField } from './es_agg_field';
import { AGG_TYPE, FIELD_ORIGIN,  } from '../../../common/constants';
import { ESGeoGridSource } from '../sources/es_geo_grid_source/es_geo_grid_source';

const mockInspectorAdapter = {};

const defaultParams = {
  label: 'my agg field',
  source: new ESGeoGridSource({ type: ESGeoGridSource.type, indexPatternId: 'my index pattern' }, mockInspectorAdapter),
  aggType: AGG_TYPE.COUNT,
  origin: FIELD_ORIGIN.SOURCE
}

describe('supportsFieldMeta', () => {
  test('Non-counting aggregations should support field meta', () => {
    const avgMetric = new ESAggField({ ...defaultParams, aggType: AGG_TYPE.AVG });
    expect(avgMetric.supportsFieldMeta()).toBe(true);
    const maxMetric = new ESAggField({ ...defaultParams, aggType: AGG_TYPE.MAX });
    expect(maxMetric.supportsFieldMeta()).toBe(true);
    const minMetric = new ESAggField({ ...defaultParams, aggType: AGG_TYPE.MIN });
    expect(minMetric.supportsFieldMeta()).toBe(true);
  });

  test('Counting aggregations should not support field meta', () => {
    const countMetric = new ESAggField({ ...defaultParams, aggType: AGG_TYPE.COUNT });
    expect(countMetric.supportsFieldMeta()).toBe(false);
    const sumMetric = new ESAggField({ ...defaultParams, aggType: AGG_TYPE.SUM });
    expect(sumMetric.supportsFieldMeta()).toBe(false);
    const uniqueCountMetric = new ESAggField({ ...defaultParams, aggType: AGG_TYPE.UNIQUE_COUNT });
    expect(uniqueCountMetric.supportsFieldMeta()).toBe(false);
  });
});
