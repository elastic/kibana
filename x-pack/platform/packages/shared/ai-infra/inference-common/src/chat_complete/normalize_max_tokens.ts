/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/** Upper bound for a caller-supplied output token cap. */
export const MAX_OUTPUT_TOKENS = 10_000_000;

/**
 * Accepts a positive integer token cap from a number or a numeric string.
 * Returns undefined for anything else, including zero, negatives, and non-integers.
 */
export const normalizeMaxTokens = (value: unknown): number | undefined => {
  let numeric: number;
  if (typeof value === 'number') {
    numeric = value;
  } else if (typeof value === 'string' && value.trim() !== '') {
    numeric = Number(value.trim());
  } else {
    return undefined;
  }

  if (!Number.isInteger(numeric) || numeric < 1 || numeric > MAX_OUTPUT_TOKENS) {
    return undefined;
  }

  return numeric;
};
