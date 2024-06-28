/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getDateHistogramBuckets } from './__mocks__/date_histogram';
import { getSnappedWindowParameters } from './get_snapped_window_parameters';

const windowParameters = {
  baselineMin: 1654579807500,
  baselineMax: 1654586107500,
  deviationMin: 1654586400000,
  deviationMax: 1654587007500,
};

const snapTimestamps = Object.keys(getDateHistogramBuckets()).map((d) => +d);

describe('getSnappedWindowParameters', () => {
  test('returns the snapped window parameters', () => {
    const snappedWindowParameters = getSnappedWindowParameters(windowParameters, snapTimestamps);

    expect(getSnappedWindowParameters(windowParameters, snapTimestamps)).toEqual({
      baselineMax: 1654586100000,
      baselineMin: 1654579800000,
      deviationMax: 1654587000000,
      deviationMin: 1654586400000,
    });

    expect(snapTimestamps.includes(snappedWindowParameters.baselineMin)).toBe(true);
    expect(snapTimestamps.includes(snappedWindowParameters.baselineMax)).toBe(true);
    expect(snapTimestamps.includes(snappedWindowParameters.deviationMin)).toBe(true);
    expect(snapTimestamps.includes(snappedWindowParameters.deviationMax)).toBe(true);
  });
});
