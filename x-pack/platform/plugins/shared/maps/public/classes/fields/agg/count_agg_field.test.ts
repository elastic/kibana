/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { CountAggField } from './count_agg_field';
import { AGG_TYPE, FIELD_ORIGIN } from '../../../../common/constants';
import { IESAggSource } from '../../sources/es_agg_source';

const mockEsAggSource = {} as unknown as IESAggSource;

const defaultParams = {
  label: 'my agg field',
  source: mockEsAggSource,
  aggType: AGG_TYPE.COUNT,
  origin: FIELD_ORIGIN.SOURCE,
};

describe('supportsFieldMetaFromEs', () => {
  test('Counting aggregations should not support field meta', () => {
    const countMetric = new CountAggField({ ...defaultParams });
    expect(countMetric.supportsFieldMetaFromEs()).toBe(false);
  });
});
