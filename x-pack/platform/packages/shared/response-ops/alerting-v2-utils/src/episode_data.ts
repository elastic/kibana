/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** Parse the `episode_data` JSON string into a plain object, returning `{}` on failure. */
export const parseEpisodeDataJson = (raw: unknown): Record<string, unknown> => {
  if (typeof raw !== 'string' || raw.length === 0) {
    return {};
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    return isPlainObject(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

/** Resolve a dot-path against nested objects, or fall back to a flattened top-level key. */
export const getValueByFieldPath = (data: Record<string, unknown>, field: string): unknown => {
  if (Object.hasOwn(data, field)) {
    return data[field];
  }

  return field.split('.').reduce<unknown>((acc, key) => {
    if (isPlainObject(acc) && Object.hasOwn(acc, key)) {
      return acc[key];
    }
    return undefined;
  }, data);
};
