/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDuration, formatStorageSize } from './format';

describe('formatDuration', () => {
  it.each([
    ['30d', '30 days'],
    ['1d', '1 day'],
    ['36h', '36 hours'],
    ['90m', '90 minutes'],
    ['45s', '45 seconds'],
    ['500ms', '500 milliseconds'],
    ['1micros', '1 microsecond'],
    ['10nanos', '10 nanoseconds'],
    ['0ms', '0 milliseconds'],
    // Elasticsearch writes negative milliseconds without a unit.
    ['-1', '-1'],
  ])('shows %s as %s', (value, expected) => {
    expect(formatDuration(value)).toBe(expected);
  });
});

describe('formatStorageSize', () => {
  it('shows "—" for a size that could not be loaded', () => {
    expect(formatStorageSize(undefined)).toBe('—');
    expect(formatStorageSize(0)).toBe('0 B');
  });
});
