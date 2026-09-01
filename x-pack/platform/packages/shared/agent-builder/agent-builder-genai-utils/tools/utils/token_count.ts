/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Estimates token count for given string or arbitrary data.
 * Uses a simple heuristic: ~4 characters per token.
 */
export const estimateTokens = (data: unknown): number => {
  const str = typeof data === 'string' ? data : JSON.stringify(data);
  return Math.ceil(str.length / 4);
};

/**
 * Truncates a string to a given number of tokens.
 * Uses a simple heuristic: ~4 characters per token.
 */
export const truncateTokens = (data: string, maxTokens: number): string => {
  return data.slice(0, maxTokens * 4);
};

/**
 * Truncates a string so its UTF-8 encoding is at most `maxBytes`, without splitting a
 * multi-byte character across the boundary. Returns the input unchanged when already within
 * the limit.
 */
export const truncateBytes = (data: string, maxBytes: number): string => {
  const buf = Buffer.from(data, 'utf8');
  if (buf.length <= maxBytes) {
    return data;
  }
  let end = maxBytes;
  // Back off past any UTF-8 continuation byte (0b10xxxxxx) so we never cut mid-character.
  // eslint-disable-next-line no-bitwise
  while (end > 0 && (buf[end] & 0xc0) === 0x80) {
    end--;
  }
  return buf.toString('utf8', 0, end);
};
