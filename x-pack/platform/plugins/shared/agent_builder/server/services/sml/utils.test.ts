/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { normalizeTaskInterval, parseDurationToMs } from './utils';

describe('parseDurationToMs', () => {
  it('parses milliseconds', () => {
    expect(parseDurationToMs('250ms')).toBe(250);
  });

  it('parses seconds', () => {
    expect(parseDurationToMs('10s')).toBe(10_000);
  });

  it('parses minutes', () => {
    expect(parseDurationToMs('2m')).toBe(120_000);
  });

  it('parses hours', () => {
    expect(parseDurationToMs('1h')).toBe(3_600_000);
  });

  it('parses days', () => {
    expect(parseDurationToMs('1d')).toBe(86_400_000);
  });

  it('rejects invalid duration', () => {
    expect(() => parseDurationToMs('abc')).toThrow('Invalid duration');
  });

  it('normalizes task manager intervals', () => {
    expect(normalizeTaskInterval('30s')).toBe('30s');
    expect(normalizeTaskInterval('90s')).toBe('2m');
    expect(normalizeTaskInterval('2h')).toBe('120m');
  });
});
