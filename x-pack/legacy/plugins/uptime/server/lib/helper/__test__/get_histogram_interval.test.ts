/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getHistogramInterval } from '../get_histogram_interval';
import { assertCloseTo } from '../assert_close_to';

describe('getHistogramInterval', () => {
  it('specifies the interval necessary to divide a given timespan into equal buckets, rounded to the nearest integer, expressed in ms', () => {
    const { interval, intervalFormatted } = getHistogramInterval('now-15m', 'now', 10);
    /**
     * Expected result is 90000.
     * These assertions were verbatim comparisons but that introduced
     * some flakiness at the ms resolution, sometimes values like "9001ms"
     * are returned.
     */
    expect(intervalFormatted.startsWith('9000')).toBeTruthy();
    expect(intervalFormatted.endsWith('ms')).toBeTruthy();
    expect(intervalFormatted).toHaveLength(7);
    assertCloseTo(interval, 90000, 10);
  });

  it('will supply a default constant value for bucketCount when none is provided', () => {
    const { interval, intervalFormatted } = getHistogramInterval('now-15m', 'now');
    /**
     * Expected result is 36000.
     * These assertions were verbatim comparisons but that introduced
     * some flakiness at the ms resolution, sometimes values like "9001ms"
     * are returned.
     */
    expect(intervalFormatted.startsWith('3600')).toBeTruthy();
    expect(intervalFormatted.endsWith('ms')).toBeTruthy();
    expect(intervalFormatted).toHaveLength(7);
    assertCloseTo(interval, 36000, 10);
  });
});
