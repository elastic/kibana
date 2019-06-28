/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getHistogramInterval } from '../get_histogram_interval';

describe('getHistogramInterval', () => {
  it('specifies the interval necessary to divide a given timespan into equal buckets, rounded to the nearest integer, expressed in ms', () => {
    expect.assertions(3);
    const result = getHistogramInterval('now-15m', 'now', 10);
    /**
     * These assertions were verbatim comparisons but that introduced
     * some flakiness at the ms resolution, sometimes values like "9001ms"
     * are returned.
     */
    expect(result.startsWith('9000')).toBeTruthy();
    expect(result.endsWith('ms')).toBeTruthy();
    expect(result).toHaveLength(7);
  });

  it('will supply a default constant value for bucketCount when none is provided', () => {
    expect.assertions(3);
    const result = getHistogramInterval('now-15m', 'now');
    /**
     * These assertions were verbatim comparisons but that introduced
     * some flakiness at the ms resolution, sometimes values like "9001ms"
     * are returned.
     */
    expect(result.startsWith('3600')).toBeTruthy();
    expect(result.endsWith('ms')).toBeTruthy();
    expect(result).toHaveLength(7);
  });
});
