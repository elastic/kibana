/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Collapse repeated append fields at the end of a dissect pattern
 *
 * Example: "%{field1} %{+body.text} %{+body.text} %{+body.text}" -> "%{field1} %{body.text}"
 *
 * This handles cases where the LLM has mapped trailing variable content to the same
 * append field multiple times, which is unnecessary since the append modifier already
 * captures all remaining content.
 *
 * Algorithm:
 * 1. Use regex with backreferences to find trailing repeated append fields (same base name)
 * 2. Replace with single instance
 * 3. Strip + and modifiers from the collapsed field if it now appears only once
 *
 * @param pattern The dissect pattern to process
 * @returns The pattern with collapsed trailing repeats
 */
export function collapseTrailingRepeats(pattern: string): string {
  // Match: %{+fieldname[modifiers]} followed by one or more space-separated repetitions of the same fieldname
  // Capture group 1: base field name (without modifiers)
  // Backreference \1: matches the same field name
  // Use explicit modifier pattern to prevent partial field name matches
  const regex = /%\{\+([^}\->?]+)(->|\?|)\}( %\{\+\1(?:->|\?|)\})+$/;
  const match = pattern.match(regex);

  if (!match) {
    return pattern;
  }

  const fieldName = match[1]; // The captured base field name
  const firstOccurrence = match[0].match(/%\{\+[^}]+\}/)![0]; // First field with its modifiers

  // Replace the entire repeated sequence with just the first occurrence
  let result = pattern.substring(0, match.index) + firstOccurrence;

  // Check if this field appears elsewhere in the pattern (before the collapsed section)
  const beforeCollapsed = pattern.substring(0, match.index!);
  const fieldNamePattern = new RegExp(
    `%\\{\\+${fieldName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[^}]*\\}`
  );
  const appearsElsewhere = fieldNamePattern.test(beforeCollapsed);

  // If the field only appears in the collapsed section (nowhere else), strip the + and modifiers
  if (!appearsElsewhere) {
    result = result.replace(firstOccurrence, `%{${fieldName}}`);
  }

  return result;
}
