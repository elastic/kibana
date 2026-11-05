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

/**
 * Models sometimes send an object or array argument as a JSON string. Parses such strings, but
 * only at the paths where validation reported an object or array was expected, so a value that
 * passed validation is never changed. Repeats while it makes progress, for strings nested in
 * strings. Returns the repaired arguments and their paths, or undefined if they cannot be repaired.
 */
export const repairJsonEncodedArguments = (
  args: unknown,
  zodSchema: z.ZodType
): { repaired: unknown; repairedPaths: string[] } | undefined => {
  let repaired = args;
  const repairedPaths: string[] = [];
  let result = zodSchema.safeParse(repaired);

  while (!result.success) {
    const repairs = result.error.issues.flatMap((issue) => {
      if (issue.code !== 'invalid_type' || !isStructuredType(issue.expected)) return [];
      const parsed = parseJsonEncodedValue(valueAt(repaired, issue.path), issue.expected);
      return parsed === undefined ? [] : [{ path: issue.path, parsed }];
    });
    if (repairs.length === 0) return undefined;

    for (const { path, parsed } of repairs) {
      repaired = replaceAt(repaired, path, parsed);
      repairedPaths.push(path.length > 0 ? path.join('.') : '<root>');
    }
    result = zodSchema.safeParse(repaired);
  }

  return { repaired, repairedPaths };
};
