/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const dissectKeyLeftModifiers = [
  '+', // Append
  '?', // Named skip key
  '*', // Reference key (ingest)
  '&', // Dereference key (ingest)
] as const;

export const dissectKeyRightModifiers = [
  '->', // Skip right padding
] as const;

export const dissectKeyModifiers = [
  ...dissectKeyLeftModifiers,
  ...dissectKeyRightModifiers,
] as const;

/**
 * A type representing a single-character left-side modifier.
 */
export type DissectKeyLeftModifier = (typeof dissectKeyLeftModifiers)[number];

export function isDissectKeyLeftModifier(char: string): char is DissectKeyLeftModifier {
  return dissectKeyLeftModifiers.includes(char as DissectKeyLeftModifier);
}

/**
 * A type representing the supported dissect key modifiers.
 * Includes generic '/n' order specification for append ordering.
 */
export type DissectKeyModifier = (typeof dissectKeyModifiers)[number] | `/${number}`;

/**
 * Common data types supported by both DISSECT and GROK
 */
export const dissectGrokESQLDataTypes = ['keyword', 'int', 'long', 'float'] as const;

/**
 * A type representing the common data types
 */
export type DissectGrokESQLDataTypes = (typeof dissectGrokESQLDataTypes)[number];

/**
 * Interface representing a field extracted from a pattern (DISSECT or GROK)
 */
export interface DissectGrokPatternField {
  name: string;
  type: DissectGrokESQLDataTypes;
}

/**
 * Result of parsing multiple patterns, with fields grouped by pattern
 */
export interface PatternParseResult {
  allFields: DissectGrokPatternField[];
  fieldsByPattern: DissectGrokPatternField[][];
}
