/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import sinon from 'sinon';
import { convertToAbsoluteTimeRange } from './convert_to_absolute_time_range';

describe('convertToAbsoluteDateRange', () => {
  test('should not change absolute time range', () => {
    const from = '2024-01-01T00:00:00.000Z';
    const to = '2024-02-01T00:00:00.000Z';

    expect(convertToAbsoluteTimeRange({ from, to })).toEqual({ from, to });
  });

  it('converts a relative day correctly', () => {
    const from = '2024-01-01T00:00:00.000Z';
    const clock = sinon.useFakeTimers(new Date(from));
    const to = new Date(clock.now).toISOString();

    expect(convertToAbsoluteTimeRange({ from, to: 'now' })).toEqual({ from, to });
    clock.restore();
  });
});
