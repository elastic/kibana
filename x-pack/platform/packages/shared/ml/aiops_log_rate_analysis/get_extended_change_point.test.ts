/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDateHistogramBuckets } from './__mocks__/date_histogram';
import { getExtendedChangePoint } from './get_extended_change_point';

describe('getExtendedChangePoint', () => {
  test('returns the extended change point', () => {
    const changePointTs = 1654586400000;
    expect(getExtendedChangePoint(getDateHistogramBuckets(), changePointTs)).toEqual({
      endTs: 1654587000000,
      startTs: 1654586100000,
    });
  });
});
