/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { batchByUrlLength } from './batch_by_url_length';

describe('batchByUrlLength', () => {
  it('returns an empty array for empty input', () => {
    expect(batchByUrlLength([])).toEqual([]);
  });

  it('returns a single batch when all names fit', () => {
    expect(batchByUrlLength(['a', 'b', 'c'])).toEqual([['a', 'b', 'c']]);
  });

  it('splits into multiple batches when names exceed the limit', () => {
    // Each name is 10 chars. With commas: "aaaaaaaaaa,bbbbbbbbbb" = 21 chars.
    // With maxJoinedLength=20, only one name fits per batch after the first.
    const names = ['aaaaaaaaaa', 'bbbbbbbbbb', 'cccccccccc'];
    const result = batchByUrlLength(names, 20);
    expect(result).toEqual([['aaaaaaaaaa'], ['bbbbbbbbbb'], ['cccccccccc']]);
  });

  it('puts a single name that exceeds the limit into its own batch', () => {
    const longName = 'a'.repeat(5000);
    const result = batchByUrlLength([longName], 3000);
    expect(result).toEqual([[longName]]);
  });

  it('handles exact boundary correctly', () => {
    // "aaa,bbb" = 7 chars. With limit=7, both fit in one batch.
    const result = batchByUrlLength(['aaa', 'bbb'], 7);
    expect(result).toEqual([['aaa', 'bbb']]);
  });

  it('starts a new batch when adding one more name would exceed the limit', () => {
    // "aaa,bbb" = 7, "aaa,bbb,c" = 9. With limit=8, 'c' goes to next batch.
    const result = batchByUrlLength(['aaa', 'bbb', 'c'], 8);
    expect(result).toEqual([['aaa', 'bbb'], ['c']]);
  });

  it('handles typical datastream names with default limit', () => {
    // 100 names of ~45 chars each. Joined: 100*45 + 99 commas = 4599 chars.
    // With default limit 3000, should produce at least 2 batches.
    const names = Array.from(
      { length: 100 },
      (_, i) => `logs-elastic_agent.filebeat_input-${String(i).padStart(7, '0')}`
    );
    const batches = batchByUrlLength(names);
    expect(batches.length).toBeGreaterThanOrEqual(2);
    // Every name must appear exactly once across all batches
    expect(batches.flat()).toEqual(names);
    // Each batch's joined length must be <= 3000
    for (const batch of batches) {
      expect(batch.join(',').length).toBeLessThanOrEqual(3000);
    }
  });
});
