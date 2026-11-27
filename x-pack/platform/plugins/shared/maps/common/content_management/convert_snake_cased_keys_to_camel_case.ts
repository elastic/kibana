/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { camelCase } from 'lodash';

/**
 * Recursively converts all object keys to camelCase. Inverse of convertCamelCasedKeysToSnakeCase.
 * The value of any key in `skipKeys` is copied as-is, without converting nested keys.
 * Use for query and filter state, where keys are Elasticsearch DSL and must not be renamed.
 */
export function convertSnakeCasedKeysToCamelCase<T>(value: T, skipKeys: string[] = []): T {
  if (Array.isArray(value)) {
    return value.map((item) => convertSnakeCasedKeysToCamelCase(item, skipKeys)) as T;
  }
  if (value === null || typeof value !== 'object') return value;
  const converted: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, child]) => {
    const camelCasedKey = camelCase(key);
    converted[camelCasedKey] = skipKeys.includes(camelCasedKey)
      ? child
      : convertSnakeCasedKeysToCamelCase(child, skipKeys);
  });
  return converted as T;
}
