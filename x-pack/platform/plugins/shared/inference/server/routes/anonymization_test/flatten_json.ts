/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { escapePointerToken } from '../../chat_complete/anonymization/types';

/** Any value that can appear in a JSON document supplied to the pattern tester. */
export type JsonLikeValue =
  | string
  | number
  | boolean
  | null
  | JsonLikeValue[]
  | { [key: string]: JsonLikeValue };

/**
 * Flattens an arbitrary JSON value into a flat map of RFC-6901 JSON Pointer path -> string
 * value, one entry per non-empty string leaf. Non-string leaves (numbers, booleans, null) are
 * left out, since only strings can carry the kind of PII this pipeline detects.
 */
export function flattenJsonStrings(value: unknown): Record<string, string> {
  const result: Record<string, string> = {};

  const visit = (node: unknown, path: string): void => {
    if (typeof node === 'string') {
      if (node.length > 0) {
        result[path] = node;
      }
      return;
    }

    if (Array.isArray(node)) {
      node.forEach((item, index) => visit(item, `${path}/${escapePointerToken(String(index))}`));
      return;
    }

    if (node && typeof node === 'object') {
      Object.entries(node as Record<string, unknown>).forEach(([key, val]) =>
        visit(val, `${path}/${escapePointerToken(key)}`)
      );
    }
  };

  visit(value, '');
  return result;
}

/**
 * Returns a deep clone of `value` with every string leaf whose JSON Pointer path (computed the
 * same way as {@link flattenJsonStrings}) is present in `replacements` substituted with the
 * matching replacement. Pointers not present in `replacements` are left unchanged.
 */
export function applyStringReplacements<T>(value: T, replacements: Record<string, string>): T {
  const visit = (node: unknown, path: string): unknown => {
    if (typeof node === 'string') {
      return path in replacements ? replacements[path] : node;
    }

    if (Array.isArray(node)) {
      return node.map((item, index) => visit(item, `${path}/${escapePointerToken(String(index))}`));
    }

    if (node && typeof node === 'object') {
      const out: Record<string, unknown> = {};
      Object.entries(node as Record<string, unknown>).forEach(([key, val]) => {
        out[key] = visit(val, `${path}/${escapePointerToken(key)}`);
      });
      return out;
    }

    return node;
  };

  return visit(value, '') as T;
}
