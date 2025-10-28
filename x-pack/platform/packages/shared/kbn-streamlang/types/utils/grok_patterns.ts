/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  DissectGrokPatternField,
  PatternParseResult,
  DissectGrokESQLDataTypes,
} from '../formats/dissect';

/**
 * Parses a single GROK pattern and extracts field information.
 * GROK syntax: %{SYNTAX:SEMANTIC[:TYPE]} where TYPE may be int | long | float.
 * If TYPE is omitted, default type is keyword.
 * Alias-only pattern like %{COMBINEDAPACHELOG} has no SEMANTIC, so yields no fields.
 */
export function parseGrokPattern(pattern: string): DissectGrokPatternField[] {
  const fieldsByName = new Map<string, DissectGrokPatternField>();

  const regex = /%{([^}]+)}/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(pattern)) !== null) {
    const inner = match[1].trim();
    if (!inner) continue;

    // Split on ':' into at most 3 parts: SYNTAX : SEMANTIC [: TYPE]
    const parts = inner.split(':');
    if (parts.length < 2) {
      // Alias-only (e.g. %{COMBINEDAPACHELOG}) -> no field extracted
      continue;
    }

    const semantic = parts[1]?.trim();
    if (!semantic) continue;

    // Optional conversion type in third position
    const conv = (parts[2] || '').trim().toLowerCase();
    const type: DissectGrokESQLDataTypes =
      conv === 'int' ? 'int' : conv === 'long' ? 'long' : conv === 'float' ? 'float' : 'keyword';

    // Normalize semantic: allow dotted and '@' names; trim whitespace
    const name = semantic;

    // Choose best type if duplicate names occur: float > int > keyword
    const existing = fieldsByName.get(name);
    if (!existing) {
      fieldsByName.set(name, { name, type });
    } else {
      const rank = (t: DissectGrokESQLDataTypes) =>
        t === 'float' ? 4 : t === 'long' ? 3 : t === 'int' ? 2 : 1;
      if (rank(type) > rank(existing.type)) {
        fieldsByName.set(name, { name, type });
      }
    }
  }

  return Array.from(fieldsByName.values());
}

/**
 * Parses multiple GROK patterns and extracts all field information.
 */
export function parseMultiGrokPatterns(patterns: string[]): PatternParseResult {
  const fieldsByPattern: DissectGrokPatternField[][] = [];
  const allFieldsMap = new Map<string, DissectGrokPatternField>();

  for (const pattern of patterns) {
    const patternFields = parseGrokPattern(pattern);
    fieldsByPattern.push(patternFields);

    for (const field of patternFields) {
      const existing = allFieldsMap.get(field.name);
      if (!existing) {
        allFieldsMap.set(field.name, field);
      } else {
        // Keep the most specific type across all patterns (float > int > keyword)
        const rank = (t: DissectGrokESQLDataTypes) =>
          t === 'float' ? 4 : t === 'long' ? 3 : t === 'int' ? 2 : 1;
        if (rank(field.type) > rank(existing.type)) {
          allFieldsMap.set(field.name, field);
        }
      }
    }
  }

  return {
    allFields: Array.from(allFieldsMap.values()),
    fieldsByPattern,
  };
}
