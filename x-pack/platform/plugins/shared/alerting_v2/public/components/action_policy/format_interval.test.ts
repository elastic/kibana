/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatInterval } from './format_interval';

describe('formatInterval', () => {
  it('returns an empty string for empty input', () => {
    expect(formatInterval('')).toBe('');
  });

  it('returns the raw value for unrecognized formats', () => {
    expect(formatInterval('abc')).toBe('abc');
    expect(formatInterval('5x')).toBe('5x');
  });

  it('pluralizes minutes correctly', () => {
    expect(formatInterval('5m')).toBe('5 minutes');
    expect(formatInterval('1m')).toBe('1 minute');
  });

  it('pluralizes seconds correctly', () => {
    expect(formatInterval('30s')).toBe('30 seconds');
    expect(formatInterval('1s')).toBe('1 second');
  });

  it('pluralizes hours correctly', () => {
    expect(formatInterval('1h')).toBe('1 hour');
    expect(formatInterval('2h')).toBe('2 hours');
  });

  it('pluralizes days correctly', () => {
    expect(formatInterval('1d')).toBe('1 day');
    expect(formatInterval('7d')).toBe('7 days');
  });
});
