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
 * 1. Look for a pattern of: (space + append_field) repeated 2+ times at the end
 * 2. Compare only the base field name (ignoring modifiers like ->)
 * 3. Replace with single instance: space + first append_field occurrence
 *
 * @param pattern The dissect pattern to process
 * @returns The pattern with collapsed trailing repeats
 */
export function collapseTrailingRepeats(pattern: string): string {
  // Helper function to extract base field name without modifiers
  const getBaseFieldName = (field: string): string => {
    // Match %{+fieldname} or %{+fieldname->} or %{+fieldname?} etc.
    const match = field.match(/%\{\+([^}\->?]+)/);
    return match ? match[1] : '';
  };

  let currentPattern = pattern;
  let changed = true;
  const collapsedFields = new Set<string>(); // Track which fields we collapsed

  // Keep applying until no more changes
  while (changed) {
    changed = false;

    // Match trailing append fields separated by single spaces
    // Pattern: %{+field[modifiers]}( %{+field[modifiers]})+ at the end
    const regex = /(%\{\+[^}]+\})( %\{\+[^}]+\})+$/;
    const match = currentPattern.match(regex);

    if (match) {
      const trailingPart = match[0];
      const beforeTrailing = currentPattern.substring(0, match.index);

      // Split the trailing part into individual fields (including the first one without leading space)
      const firstField = match[1];
      const remainingFields =
        trailingPart.substring(firstField.length).match(/ %\{\+[^}]+\}/g) || [];
      const fields = [firstField, ...remainingFields];

      if (fields.length > 1) {
        // Extract base field names for each field
        const baseNames = fields.map((f) => getBaseFieldName(f.trim()));

        // Find the longest sequence of the same base field name at the end
        const lastBaseName = baseNames[baseNames.length - 1];

        if (lastBaseName) {
          // Count consecutive occurrences of the last base field name from the end
          let count = 0;
          for (let i = baseNames.length - 1; i >= 0; i--) {
            if (baseNames[i] === lastBaseName) {
              count++;
            } else {
              break;
            }
          }

          if (count > 1) {
            // Keep only the first occurrence of the repeated field
            const keptFields = fields.slice(0, baseNames.length - count + 1);
            // Reconstruct: first field doesn't need leading space, rest do
            const reconstructed = keptFields[0] + keptFields.slice(1).join('');
            currentPattern = beforeTrailing + reconstructed;
            collapsedFields.add(lastBaseName); // Track that we collapsed this field
            changed = true;
          }
        }
      }
    }
  }

  // Strip + and -> modifiers only from fields that we collapsed
  // and that now only appear once in the pattern
  if (collapsedFields.size > 0) {
    const allAppendFields = currentPattern.match(/%\{\+[^}]+\}/g) || [];

    // Count occurrences of each base field name
    const fieldCounts = new Map<string, string[]>();

    allAppendFields.forEach((field) => {
      const baseName = getBaseFieldName(field);
      if (baseName) {
        if (!fieldCounts.has(baseName)) {
          fieldCounts.set(baseName, []);
        }
        fieldCounts.get(baseName)!.push(field);
      }
    });

    // For collapsed fields that now appear only once, strip the + and modifiers
    fieldCounts.forEach((occurrences, baseName) => {
      if (collapsedFields.has(baseName) && occurrences.length === 1) {
        const fieldWithModifiers = occurrences[0];
        // Remove + and any modifiers like -> or ?
        const fieldWithoutModifiers = `%{${baseName}}`;
        currentPattern = currentPattern.replace(fieldWithModifiers, fieldWithoutModifiers);
      }
    });
  }

  return currentPattern;
}
