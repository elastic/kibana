/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { applyBackoffJitter } from './backoff_jitter';

describe('applyBackoffJitter', () => {
  it('returns values in [delayMs/2, delayMs] for positive delay', () => {
    const results = new Set<number>();
    for (let i = 0; i < 80; i++) {
      const ms = applyBackoffJitter(1000);
      results.add(ms);
      expect(ms).toBeGreaterThanOrEqual(500);
      expect(ms).toBeLessThanOrEqual(1000);
    }
    expect(results.size).toBeGreaterThan(1);
  });
});
