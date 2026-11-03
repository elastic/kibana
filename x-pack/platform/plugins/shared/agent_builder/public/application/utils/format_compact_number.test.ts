/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { formatCompactNumber } from './format_compact_number';

describe('formatCompactNumber', () => {
  it('keeps numbers below one thousand as they are', () => {
    expect(formatCompactNumber(0)).toBe('0');
    expect(formatCompactNumber(78)).toBe('78');
    expect(formatCompactNumber(999)).toBe('999');
  });

  it('abbreviates thousands with at most one decimal', () => {
    expect(formatCompactNumber(1000)).toBe('1k');
    expect(formatCompactNumber(12345)).toBe('12.3k');
  });

  it('abbreviates millions with at most one decimal', () => {
    expect(formatCompactNumber(1500000)).toBe('1.5m');
  });
});
