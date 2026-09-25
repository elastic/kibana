/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { chunkByUrlLength } from './chunk_by_url_length';

// MAX_URL_NAMES_BYTES = 3_500; commas encode as %2C (3 bytes each)
const MAX_BYTES = 3_500;

const nameOfLength = (n: number) => 'a'.repeat(n);

describe('chunkByUrlLength', () => {
  it('returns an empty array for empty input', () => {
    expect(chunkByUrlLength([])).toEqual([]);
  });

  it('returns a single chunk when all names fit within the limit', () => {
    const names = ['index-one', 'index-two', 'index-three'];
    const result = chunkByUrlLength(names);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(names);
  });

  it('puts a single name that exceeds the limit in its own chunk', () => {
    // A name longer than MAX_BYTES cannot be split further — it goes into its own chunk
    const bigName = nameOfLength(MAX_BYTES + 1);
    const result = chunkByUrlLength([bigName]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([bigName]);
  });

  it('splits into a new chunk when adding a name would exceed the limit', () => {
    // Fill first chunk almost to the limit, then add a name that pushes it over
    const firstName = nameOfLength(MAX_BYTES - 10);
    // Cost of second name = length + 3 (%2C separator) > remaining 10 bytes
    const secondName = nameOfLength(8);
    const result = chunkByUrlLength([firstName, secondName]);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual([firstName]);
    expect(result[1]).toEqual([secondName]);
  });

  it('accounts for %2C (3-byte) separator cost between names in the same chunk', () => {
    // Two names that together equal exactly MAX_BYTES including the separator should fit
    const a = nameOfLength(MAX_BYTES - 3 - 10); // leaves room for separator + b
    const b = nameOfLength(10);
    // total bytes = a.length + 3 + b.length = MAX_BYTES - 3 - 10 + 3 + 10 = MAX_BYTES — fits
    const result = chunkByUrlLength([a, b]);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual([a, b]);
  });

  it('keeps first name of each new chunk without adding a separator cost', () => {
    // Exactly fill a chunk, then the next name starts a new chunk without separator
    const filler = nameOfLength(MAX_BYTES);
    const next = nameOfLength(5);
    const result = chunkByUrlLength([filler, next]);
    expect(result).toHaveLength(2);
    expect(result[1]).toEqual([next]);
  });

  it('produces multiple chunks for many names', () => {
    // Each name is 1000 bytes; three fit in a chunk (1000 + 1003 + 1003 = 3006 < 3500),
    // four would be 3006 + 1003 = 4009 > 3500, so chunks of 3
    const name = nameOfLength(1000);
    const names = Array(9).fill(name);
    const result = chunkByUrlLength(names);
    expect(result).toHaveLength(3);
    result.forEach((chunk) => expect(chunk).toHaveLength(3));
  });

  it('preserves order of names across chunks', () => {
    const names = Array.from(
      { length: 20 },
      (_, i) => `index-${String(i).padStart(3, '0')}-${'x'.repeat(200)}`
    );
    const result = chunkByUrlLength(names);
    expect(result.flat()).toEqual(names);
  });
});
