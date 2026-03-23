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
  const { patterns, pattern_definitions } = grokProcessor;

  if (!pattern_definitions || Object.keys(pattern_definitions).length === 0) {
    return patterns;
  }

  // Recursively inline a single pattern
  function unwrapPattern(pattern: string, seen: Set<string> = new Set()): string {
    /**
     * Intentional optimization: previously a single regex /%{([A-Z0-9_]+)(:[^}]*)?}/g
     * with an optional capture group. We now perform two deterministic passes with two
     * separate regexes - one for patterns WITH a field name and one for patterns
     * WITHOUT - eliminating the optional branch.
     */
    const WITHOUT_FIELD = /%{([A-Z0-9_]+)}/g; // %{PATTERN}
    const WITH_FIELD = /%{([A-Z0-9_]+):([^}]+)}/g; // %{PATTERN:field}

    const expand = (match: string, key: string, fieldName?: string): string => {
      if (!pattern_definitions || !pattern_definitions[key]) {
        return match; // unknown definition - leave untouched
      }
      if (seen.has(key)) {
        return match; // cyclic reference safeguard
      }
      seen.add(key);
      const inlined = unwrapPattern(pattern_definitions[key], seen);
      seen.delete(key);
      if (fieldName) {
        return `(?<${fieldName}>${inlined})`;
      }
      return `(${inlined})`;
    };

    return pattern.replace(WITHOUT_FIELD, expand).replace(WITH_FIELD, expand);
  }

  return patterns.map((pattern) => unwrapPattern(pattern));
}
