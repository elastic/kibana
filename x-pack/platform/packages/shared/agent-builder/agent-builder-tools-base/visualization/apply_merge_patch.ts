/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Pure JSON Merge Patch (RFC 7386) application:
 *
 * - Objects merge recursively, key by key.
 * - A `null` patch value deletes the target key.
 * - Everything else — scalars, arrays, a non-object patch — replaces the
 *   target wholesale (arrays are never merged element-wise).
 *
 * Neither input is mutated. Untouched subtrees of `target` are shared by
 * reference in the result, so callers that mutate the result must clone first.
 */
export const applyMergePatch = (target: unknown, patch: unknown): unknown => {
  if (!isPlainObject(patch)) {
    return patch;
  }
  const result: Record<string, unknown> = isPlainObject(target) ? { ...target } : {};
  for (const [key, value] of Object.entries(patch)) {
    if (value === null) {
      delete result[key];
    } else {
      result[key] = applyMergePatch(result[key], value);
    }
  }
  return result;
};
