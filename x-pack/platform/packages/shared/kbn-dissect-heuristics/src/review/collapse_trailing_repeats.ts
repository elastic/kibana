/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Collapse repeated append fields at the end of a dissect pattern
 *
 * Example: "%{field1} %{+body.text} %{+body.text} %{+body.text}" -> "%{field1} %{+body.text}"
 *
 * This handles cases where the LLM has mapped trailing variable content to the same
 * append field multiple times, which is unnecessary since the append modifier already
 * captures all remaining content.
 *
 * Algorithm:
 * 1. Look for a pattern of: (separator + append_field) repeated 2+ times at the end
 * 2. Replace with single instance: separator + append_field
 *
 * @param pattern The dissect pattern to process
 * @returns The pattern with collapsed trailing repeats
 */
export function collapseTrailingRepeats(pattern: string): string {
  let currentPattern = pattern;
  let changed = true;

  // Keep applying both patterns until no more changes
  while (changed) {
    changed = false;

    // First, try to match from the end with separator+field pattern
    // Pattern: (separator + append_field) repeated at end
    const regexWithSeparator = /([^%]*%\{\+[^}]+\})(\1)+$/;

    let match = currentPattern.match(regexWithSeparator);
    if (match) {
      const beforeRepeats = currentPattern.substring(0, match.index);
      const singleInstance = match[1];
      currentPattern = beforeRepeats + singleInstance;
      changed = true;
      continue;
    }

    // If no match, try pattern that starts with append field (no prefix)
    // This handles: %{+field}%{+field}%{+field} or %{+field} %{+field} %{+field}
    // Match an append field followed by (separator + same field) repeated
    const regexFromStart = /^(%\{\+[^}]+\})(([^%]*)%\{\+[^}]+\})+$/;
    match = currentPattern.match(regexFromStart);

    if (match) {
      // Extract the field name from first field
      const firstField = match[1];
      const separator = match[3] || '';

      // Split by separator and check if all parts are identical
      const parts = currentPattern.split(separator).filter((p) => p.length > 0);
      const allSame = parts.every((p) => p === firstField);

      if (allSame) {
        currentPattern = firstField;
        changed = true;
      }
    }
  }

  return currentPattern;
}
