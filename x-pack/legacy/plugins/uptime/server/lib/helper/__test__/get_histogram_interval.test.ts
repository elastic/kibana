/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getHistogramInterval } from '../get_histogram_interval';
import { assertCloseTo } from '../assert_close_to';

describe('getHistogramInterval', () => {
  it('specifies the interval necessary to divide a given timespan into equal buckets, rounded to the nearest integer, expressed in ms', () => {
    const interval = getHistogramInterval('now-15m', 'now', 10);
    assertCloseTo(interval, 90000, 10);
  });

  it('will supply a default constant value for bucketCount when none is provided', () => {
    const interval = getHistogramInterval('now-15m', 'now');
    assertCloseTo(interval, 36000, 10);
  });
});
