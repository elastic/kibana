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
