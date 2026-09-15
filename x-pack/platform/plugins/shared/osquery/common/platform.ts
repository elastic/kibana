/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DEFAULT_PLATFORM } from './constants';

/**
 * True when a platform string names every OS in {@link DEFAULT_PLATFORM},
 * regardless of token order, spacing, or duplicate tokens.
 *
 * The stored value's token order depends on how it was produced (the flyout's
 * seeded default, a pack upload, or a hand-edited saved object), so
 * `'linux,darwin,windows'` and `'linux,windows,darwin'` must be treated alike.
 * Duplicate tokens (`'linux,linux,linux'`) are a Linux restriction, not "all
 * platforms" — comparison uses the distinct token set.
 */
const ALL_PLATFORM_TOKENS = new Set(DEFAULT_PLATFORM.split(',').map((token) => token.trim()));

const parsePlatformTokens = (value: string): string[] =>
  value
    .split(',')
    .map((token) => token.trim())
    .filter((token) => token.length > 0);

export const isAllPlatforms = (value?: string): boolean => {
  if (!value) {
    return false;
  }

  const tokens = new Set(parsePlatformTokens(value));

  if (tokens.size !== ALL_PLATFORM_TOKENS.size) {
    return false;
  }

  for (const token of tokens) {
    if (!ALL_PLATFORM_TOKENS.has(token)) {
      return false;
    }
  }

  return true;
};

/** True when two platform CSVs name the same distinct token set, ignoring order and spacing. */
export const platformSetsEqual = (left?: string, right?: string): boolean => {
  if (!left && !right) {
    return true;
  }

  if (!left || !right) {
    return false;
  }

  const leftTokens = new Set(parsePlatformTokens(left));
  const rightTokens = new Set(parsePlatformTokens(right));

  if (leftTokens.size !== rightTokens.size) {
    return false;
  }

  for (const token of leftTokens) {
    if (!rightTokens.has(token)) {
      return false;
    }
  }

  return true;
};
