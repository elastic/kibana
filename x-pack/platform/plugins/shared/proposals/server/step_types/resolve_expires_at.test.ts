/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { parseDurationMs, resolveExpiresAt } from './resolve_expires_at';

const NOW = Date.parse('2026-01-01T00:00:00.000Z');

describe('parseDurationMs', () => {
  it.each([
    ['24h', 24 * 60 * 60 * 1000],
    ['72h', 72 * 60 * 60 * 1000],
    ['30m', 30 * 60 * 1000],
    ['1w', 7 * 24 * 60 * 60 * 1000],
    ['1w2d3h4m5s6ms', 788645006],
  ])('should parse %s', (input, expected) => {
    expect(parseDurationMs(input)).toBe(expected);
  });

  it.each(['', 'soon', '24', '24hours', '-1h', '1h30x'])(
    'should reject %p rather than silently yielding a deadline',
    (input) => {
      expect(() => parseDurationMs(input)).toThrow(/Invalid duration format/);
    }
  );

  it('should reject units in ascending order, matching the engine grammar', () => {
    expect(() => parseDurationMs('3h1w')).toThrow(/Invalid duration format/);
  });

  it('should reject a zero duration, which would expire the proposal immediately', () => {
    expect(() => parseDurationMs('0h')).toThrow(/greater than zero/);
  });
});

describe('resolveExpiresAt', () => {
  it('should resolve a duration against the creation time', () => {
    expect(resolveExpiresAt('24h', NOW)).toBe('2026-01-02T00:00:00.000Z');
  });

  it('should stay absent when the caller sets no deadline', () => {
    expect(resolveExpiresAt(undefined, NOW)).toBeUndefined();
  });
});
