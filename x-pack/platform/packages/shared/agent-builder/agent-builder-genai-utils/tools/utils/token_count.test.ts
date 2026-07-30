/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { truncateBytes } from './token_count';

describe('truncateBytes', () => {
  it('returns the input unchanged when within the byte budget', () => {
    expect(truncateBytes('hello', 100)).toBe('hello');
  });

  it('truncates ASCII to at most maxBytes bytes', () => {
    const result = truncateBytes('abcdefghij', 4);
    expect(result).toBe('abcd');
    expect(Buffer.byteLength(result, 'utf8')).toBeLessThanOrEqual(4);
  });

  it('does not split a multi-byte character across the boundary', () => {
    // 'é' is 2 bytes in UTF-8 (0xC3 0xA9); 10 of them = 20 bytes.
    // Truncating to 5 bytes must back off to 4 (two whole 'é'), not cut mid-character.
    const result = truncateBytes('é'.repeat(10), 5);
    expect(result).toBe('éé');
    expect(Buffer.byteLength(result, 'utf8')).toBe(4);
    expect(result).not.toContain('�');
  });

  it('handles 4-byte characters (emoji) at the boundary', () => {
    // '😀' is 4 bytes in UTF-8; truncating to 6 bytes must yield one emoji (4 bytes), not a split.
    const result = truncateBytes('😀😀', 6);
    expect(result).toBe('😀');
    expect(Buffer.byteLength(result, 'utf8')).toBe(4);
    expect(result).not.toContain('�');
  });
});
