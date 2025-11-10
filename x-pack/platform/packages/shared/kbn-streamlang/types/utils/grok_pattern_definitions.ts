/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { GrokProcessor } from '../processors';

/**
 * Unwraps pattern definitions by recursively inlining them
 * into the provided patterns. This ensures that all patterns are fully
 * expanded, resolving any references to other patterns defined in the
 * `pattern_definitions` object. Prevents infinite recursion in case of
 * cyclic definitions.
 *
 * @param grokProcessor - An object containing GROK patterns and their definitions.
 * @returns An array of fully expanded patterns.
 */
export function unwrapPatternDefinitions(
  grokProcessor: Pick<GrokProcessor, 'patterns' | 'pattern_definitions'>
): string[] {
  // eslint-disable-next-line @typescript-eslint/naming-convention
  const { patterns, pattern_definitions } = grokProcessor;

  if (!pattern_definitions || Object.keys(pattern_definitions).length === 0) {
    return patterns;
  }

  // Recursively inline a single pattern
  function unwrapPattern(pattern: string, seen: Set<string> = new Set()): string {
    // Match %{PATTERN_NAME} or %{PATTERN_NAME:field}
    return pattern.replace(/%{([A-Z0-9_]+)(:[^}]*)?}/g, (match, key, fieldName) => {
      if (pattern_definitions && pattern_definitions[key]) {
        if (seen.has(key)) {
          // Prevent infinite recursion on cyclic definitions
          return match;
        }
        seen.add(key);
        const inlined = unwrapPattern(pattern_definitions[key], seen);
        seen.delete(key);
        if (fieldName) {
          // Named capture group
          return `(?<${fieldName.substring(1)}>${inlined})`;
        }
        return `(${inlined})`;
      }
      return match; // Leave as is if not in patternDefs
    });
  }

  return patterns.map((pattern) => unwrapPattern(pattern));
}
