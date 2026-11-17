/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { camelCase } from 'lodash';

/**
 * Recursively converts all object keys to camelCase. Inverse of convertCamelCasedKeysToSnakeCase.
 */
export function convertSnakeCasedKeysToCamelCase<T>(value: T): T {
  if (Array.isArray(value)) return value.map(convertSnakeCasedKeysToCamelCase) as T;
  if (value === null || typeof value !== 'object') return value;
  const converted: Record<string, unknown> = {};
  Object.entries(value).forEach(([key, child]) => {
    converted[camelCase(key)] = convertSnakeCasedKeysToCamelCase(child);
  });
  return converted as T;
}
