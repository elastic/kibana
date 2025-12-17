/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { DissectField, DissectModifiers } from './types';
import { getTrailingWhitespaceLengths, allSame } from './utils';

/**
 * Detect if a field needs the right padding modifier (->)
 * Right padding handles variable trailing whitespace
 */
export function detectRightPadding(values: string[]): boolean {
  const trailingSpaces = getTrailingWhitespaceLengths(values);
  const minSpaces = Math.min(...trailingSpaces);
  const maxSpaces = Math.max(...trailingSpaces);

  // If trailing whitespace varies, use right padding
  return maxSpaces > minSpaces && maxSpaces > 0;
}

/**
 * Determine if a field should be skipped
 * Skip fields are either:
 * 1. All values are identical and match common "empty" patterns
 * 2. All values are the same (optional named skip)
 */
export function shouldSkipField(values: string[], useNamedSkip: boolean = true): boolean {
  if (!allSame(values)) {
    return false;
  }

  const value = values[0].trim().toLowerCase();
  const emptyPatterns = ['-', '', 'null', 'n/a', 'none', '?'];

  // Always skip if it matches empty patterns
  if (emptyPatterns.includes(value)) {
    return true;
  }

  // Optionally skip other constant values with named skip
  return false;
}

/**
 * Detect all modifiers for a field
 */
export function detectModifiers(field: DissectField): DissectModifiers {
  const modifiers: DissectModifiers = {};

  // Check for right padding
  if (detectRightPadding(field.values)) {
    modifiers.rightPadding = true;
  }

  // Check if field should be skipped
  if (shouldSkipField(field.values)) {
    modifiers.skip = true;

    // Determine if we should use named skip
    const value = field.values[0].trim().toLowerCase();
    const emptyPatterns = ['-', '', 'null', 'n/a', 'none', '?'];
    modifiers.namedSkip = !emptyPatterns.includes(value);
  }

  return modifiers;
}
