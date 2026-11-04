/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EisInferenceEndpointMetadata } from '@kbn/inference-common';
import { isNearingEndOfLife } from './model_badges';

const NOW = new Date('2026-06-01T00:00:00.000Z');

const makeMetadata = (end_of_life_date?: string): EisInferenceEndpointMetadata => ({
  heuristics: { end_of_life_date },
});

describe('isNearingEndOfLife', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns false when metadata is undefined', () => {
    expect(isNearingEndOfLife(undefined)).toBe(false);
  });

  it('returns false when end_of_life_date is absent', () => {
    expect(isNearingEndOfLife(makeMetadata())).toBe(false);
  });

  it('returns false when end_of_life_date is an invalid string', () => {
    expect(isNearingEndOfLife(makeMetadata('not-a-date'))).toBe(false);
  });

  it('returns false when EOL is more than 60 days away', () => {
    // 61 days from NOW
    expect(isNearingEndOfLife(makeMetadata('2026-08-01'))).toBe(false);
  });

  it('returns true when EOL is exactly 60 days away', () => {
    // exactly 60 days from 2026-06-01
    expect(isNearingEndOfLife(makeMetadata('2026-07-31'))).toBe(true);
  });

  it('returns true when EOL is within 60 days', () => {
    expect(isNearingEndOfLife(makeMetadata('2026-06-15'))).toBe(true);
  });

  it('returns true when EOL is today', () => {
    expect(isNearingEndOfLife(makeMetadata('2026-06-01'))).toBe(true);
  });

  it('returns true when EOL is in the past', () => {
    expect(isNearingEndOfLife(makeMetadata('2026-01-01'))).toBe(true);
  });
});
