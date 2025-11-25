/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  dissectKeyModifiers,
  isDissectKeyLeftModifier,
  type DissectKeyLeftModifier,
  type DissectGrokPatternField,
  type PatternParseResult,
} from '../formats/dissect';

/**
 * Parses a single DISSECT pattern and extracts field information.
 * DISSECT (both ingest and ES|QL) always emits string (keyword) values; any inline type
 * suffixes like :int or :float are NOT supported and are treated as part of the literal name.
 */
export function parseDissectPattern(pattern: string): DissectGrokPatternField[] {
  const fields: DissectGrokPatternField[] = [];
  const regex = /%{([^}]+)}/g;
  let match: RegExpExecArray | null;

  const rightPaddingToken = dissectKeyModifiers.find((m) => m === '->');

  while ((match = regex.exec(pattern)) !== null) {
    let keyDefinition = match[1];

    let leftMod: DissectKeyLeftModifier | undefined;
    const firstChar = keyDefinition?.[0];
    if (firstChar && isDissectKeyLeftModifier(firstChar)) {
      leftMod = firstChar;
      keyDefinition = keyDefinition.slice(1);
    }

    if (!keyDefinition || leftMod === '?') continue;
    if (leftMod === '*' || leftMod === '&') continue; // reference keys ignored

    if (rightPaddingToken && keyDefinition.endsWith(rightPaddingToken)) {
      keyDefinition = keyDefinition.slice(0, -rightPaddingToken.length);
    }

    const orderMatch = keyDefinition.match(/^(.+)\/(\d+)$/);
    if (orderMatch) keyDefinition = orderMatch[1];

    keyDefinition = keyDefinition.trim();
    if (!keyDefinition) continue;

    if (!fields.some((f) => f.name === keyDefinition)) {
      fields.push({ name: keyDefinition, type: 'keyword' });
    }
  }

  return fields;
}

export function parseMultiDissectPatterns(patterns: string[]): PatternParseResult {
  const fieldsByPattern: DissectGrokPatternField[][] = [];
  const allFieldsMap = new Map<string, DissectGrokPatternField>();

  for (const pattern of patterns) {
    const patternFields = parseDissectPattern(pattern);
    fieldsByPattern.push(patternFields);
    for (const field of patternFields) {
      if (!allFieldsMap.has(field.name)) {
        allFieldsMap.set(field.name, field);
      }
    }
  }

  return {
    allFields: Array.from(allFieldsMap.values()),
    fieldsByPattern,
  };
}
