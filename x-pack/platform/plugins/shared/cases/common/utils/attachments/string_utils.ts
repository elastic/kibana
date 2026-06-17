/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const isStringArray = (value: unknown): value is string[] =>
  Array.isArray(value) && value.every((item) => typeof item === 'string');

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const toStringArray = (value: unknown): string[] => {
  if (isNonEmptyString(value)) {
    return [value];
  }

  if (isStringArray(value)) {
    return value.filter(isNonEmptyString);
  }

  return [];
};

export const toStringOrStringArray = (value: unknown): string | string[] | undefined => {
  const values = toStringArray(value);
  if (values.length === 0) {
    return undefined;
  }

  return values.length === 1 ? values[0] : values;
};

/**
 * Returns the first non-empty string from the provided value (string or string[]),
 * or `null` when the value is nullish or contains only empty strings.
 */
export const getNonEmptyField = (field: unknown): string | null => {
  const normalized = toStringOrStringArray(field);
  const firstItem = Array.isArray(normalized) ? normalized[0] : normalized;
  if (firstItem == null || firstItem === '') {
    return null;
  }
  return firstItem;
};
