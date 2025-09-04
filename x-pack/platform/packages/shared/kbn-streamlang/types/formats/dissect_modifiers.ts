/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * The supported modifiers for dissect keys.
 */
export const dissectKeyModifiers = [
  '->', // Skip right padding
  '+', // Append
  '?', // Named skip key
  '*', // Reference key
  '&', // Dereference key
  '/1', // Order specification 01
  '/2', // Order specification 02
  '/3', // Order specification 03
  '/4', // Order specification 04
  '/5', // Order specification 05
  '/6', // Order specification 06
  '/7', // Order specification 07
  '/8', // Order specification 08
  '/9', // Order specification 09
] as const;

/**
 * A type representing the supported dissect key modifiers.
 */
export type DissectKeyModifier = (typeof dissectKeyModifiers)[number];

/**
 * Parses a dissect pattern and extracts the field names (keys) used in the pattern.
 * A dissect pattern consists of literal text and field references enclosed in `%{}`.
 * For example, in the pattern `%{client} %{method} %{path}`, the field names are `client`, `method`, and `path`.
 * Keys in a pattern may include modifiers, e.g. `%{+field}`, `%{field;modifier}`, etc.
 * Common modifiers accepted by Dissect Ingest Processor are tracked in {@link dissectKeyModifiers}
 * @param pattern
 * @returns array of field names (keys) found in the pattern
 */
export function parseDissectPattern(pattern: string): string[] {
  const regex = /%{([^}]+)}/g;
  const fields: string[] = [];
  let match;

  while ((match = regex.exec(pattern)) !== null) {
    let field = match[1];
    // Remove any known modifiers from the field name
    for (const modifier of dissectKeyModifiers) {
      if (field.startsWith(modifier)) {
        field = field.slice(modifier.length);
      } else if (field.endsWith(modifier)) {
        field = field.slice(0, -modifier.length);
      }
    }
    // If there's a semicolon, it indicates additional options; take only the part before it
    if (field.includes(';')) {
      field = field.split(';')[0];
    }
    if (field && !fields.includes(field)) {
      fields.push(field);
    }
  }

  return fields;
}
