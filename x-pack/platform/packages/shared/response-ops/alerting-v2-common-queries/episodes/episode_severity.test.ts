/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EpisodeSeverity,
  isSupportedEpisodeSeverity,
  normalizeEpisodeSeverity,
} from './episode_severity';

describe('isSupportedEpisodeSeverity', () => {
  it('returns true for supported severity values', () => {
    expect(isSupportedEpisodeSeverity('high')).toBe(true);
    expect(isSupportedEpisodeSeverity('CRITICAL')).toBe(true);
  });

  it('accepts values that lodash lowerCase normalizes to a supported severity', () => {
    // Native toLowerCase() would leave trailing punctuation (`high_`) and reject these.
    expect(isSupportedEpisodeSeverity('HIGH_')).toBe(true);
    expect(isSupportedEpisodeSeverity(' high ')).toBe(true);
  });

  it('returns false for unsupported, null, or empty values', () => {
    expect(isSupportedEpisodeSeverity('SEV1')).toBe(false);
    expect(isSupportedEpisodeSeverity(null)).toBe(false);
    expect(isSupportedEpisodeSeverity(undefined)).toBe(false);
    expect(isSupportedEpisodeSeverity('')).toBe(false);
  });
});

describe('normalizeEpisodeSeverity', () => {
  it('lowercases severity values with lodash lowerCase semantics', () => {
    expect(normalizeEpisodeSeverity('HIGH')).toBe(EpisodeSeverity.High);
    expect(normalizeEpisodeSeverity('HIGH_')).toBe(EpisodeSeverity.High);
    expect(normalizeEpisodeSeverity(' high ')).toBe(EpisodeSeverity.High);
  });
});
