/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatDuration } from './format_duration';

describe('formatDuration', () => {
  it.each([
    ['1s', 'sec', '1 sec'],
    ['10s', 'sec', '10 sec'],
    ['1m', 'min', '1 min'],
    ['10m', 'min', '10 min'],
    ['1h', 'hr', '1 hr'],
    ['10h', 'hr', '10 hr'],
    ['1d', 'day', '1 day'],
    ['10d', 'days', '10 days'],
  ])('formats %s with short units', (input, _unit, expected) => {
    expect(formatDuration(input)).toBe(expected);
  });

  it.each([
    ['1s', '1 second'],
    ['10s', '10 seconds'],
    ['1m', '1 minute'],
    ['10m', '10 minutes'],
    ['1h', '1 hour'],
    ['10h', '10 hours'],
    ['1d', '1 day'],
    ['10d', '10 days'],
  ])('formats %s with full units', (input, expected) => {
    expect(formatDuration(input, true)).toBe(expected);
  });

  it('throws on an unrecognized unit', () => {
    expect(() => formatDuration('5w')).toThrow('Invalid duration "5w"');
    expect(() => formatDuration('100ms')).toThrow('Invalid duration "100ms"');
  });
});
