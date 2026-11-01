/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

type JsonObject = Record<string, unknown>;

const isJsonObject = (value: unknown): value is JsonObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const valueAt = (value: unknown, path: readonly PropertyKey[]): unknown =>
  path.reduce<unknown>((current, key) => {
    if (Array.isArray(current) && typeof key === 'number') return current[key];
    if (isJsonObject(current) && typeof key === 'string') return current[key];
    return undefined;
  }, value);

const replaceAt = (value: unknown, path: readonly PropertyKey[], replacement: unknown): unknown => {
  if (path.length === 0) return replacement;
  const [key, ...rest] = path;
  if (Array.isArray(value) && typeof key === 'number') {
    return value.map((item, index) => (index === key ? replaceAt(item, rest, replacement) : item));
  }
  if (isJsonObject(value) && typeof key === 'string') {
    return { ...value, [key]: replaceAt(value[key], rest, replacement) };
  }
  return value;
};

/** Removes the property at `path`; its parent must be an object and its last key a string. */
const removeAt = (value: unknown, path: readonly PropertyKey[]): unknown => {
  const parentPath = path.slice(0, -1);
  const { [path[path.length - 1] as string]: _removed, ...remaining } = valueAt(
    value,
    parentPath
  ) as JsonObject;
  return replaceAt(value, parentPath, remaining);
};

const isStructuredType = (expected: string): expected is 'object' | 'array' =>
  expected === 'object' || expected === 'array';

const parseJsonEncodedValue = (value: unknown, expected: 'object' | 'array'): unknown => {
  if (typeof value !== 'string') return undefined;
  try {
    const parsed: unknown = JSON.parse(value);
    const matches = expected === 'array' ? Array.isArray(parsed) : isJsonObject(parsed);
    return matches ? parsed : undefined;
  } catch (error) {
    return undefined;
  }
};

type Repair = { path: readonly PropertyKey[]; parsed: unknown } | { path: readonly PropertyKey[] };

/**
 * Repairs tool call arguments that fail validation in ways models commonly produce, only at the
 * paths where validation failed, so a value that passed validation is never changed:
 * - an object or array argument sent as a JSON string is parsed, where validation expected an
 *   object or array;
 * - a `null` the schema does not accept is dropped, so an optional property falls back to being
 *   absent. OpenAI strict function calling sends `null` for every optional property the model
 *   does not set.
 * Repeats while it makes progress, for strings nested in strings. Returns the repaired arguments
 * and their paths, or undefined if they cannot be repaired.
 */
export const repairToolCallArguments = (
  args: unknown,
  zodSchema: z.ZodType
): { repaired: unknown; repairedPaths: string[] } | undefined => {
  let repaired = args;
  const repairedPaths: string[] = [];
  let result = zodSchema.safeParse(repaired);

  while (!result.success) {
    const repairs = result.error.issues.flatMap((issue): Repair[] => {
      const value = valueAt(repaired, issue.path);
      if (
        value === null &&
        typeof issue.path[issue.path.length - 1] === 'string' &&
        isJsonObject(valueAt(repaired, issue.path.slice(0, -1)))
      ) {
        return [{ path: issue.path }];
      }
      if (issue.code !== 'invalid_type' || !isStructuredType(issue.expected)) return [];
      const parsed = parseJsonEncodedValue(value, issue.expected);
      return parsed === undefined ? [] : [{ path: issue.path, parsed }];
    });
    if (repairs.length === 0) return undefined;

    for (const repair of repairs) {
      repaired =
        'parsed' in repair
          ? replaceAt(repaired, repair.path, repair.parsed)
          : removeAt(repaired, repair.path);
      repairedPaths.push(repair.path.length > 0 ? repair.path.join('.') : '<root>');
    }
    result = zodSchema.safeParse(repaired);
  }

  return { repaired, repairedPaths };
};
