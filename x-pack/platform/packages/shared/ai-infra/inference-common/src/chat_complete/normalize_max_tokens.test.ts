/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MAX_OUTPUT_TOKENS, normalizeMaxTokens } from './normalize_max_tokens';

describe('normalizeMaxTokens', () => {
  it('keeps a positive integer and a numeric string', () => {
    expect(normalizeMaxTokens(16000)).toBe(16000);
    expect(normalizeMaxTokens('16000')).toBe(16000);
    expect(normalizeMaxTokens(' 16000 ')).toBe(16000);
  });

  it('rejects empty, non-numeric, non-integer, and out-of-range values', () => {
    expect(normalizeMaxTokens(undefined)).toBeUndefined();
    expect(normalizeMaxTokens(null)).toBeUndefined();
    expect(normalizeMaxTokens('')).toBeUndefined();
    expect(normalizeMaxTokens('nope')).toBeUndefined();
    expect(normalizeMaxTokens(0)).toBeUndefined();
    expect(normalizeMaxTokens(-1)).toBeUndefined();
    expect(normalizeMaxTokens(1.5)).toBeUndefined();
    expect(normalizeMaxTokens(Number.NaN)).toBeUndefined();
    expect(normalizeMaxTokens(Number.POSITIVE_INFINITY)).toBeUndefined();
    expect(normalizeMaxTokens(MAX_OUTPUT_TOKENS + 1)).toBeUndefined();
  });
});
