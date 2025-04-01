/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const toArray = <T>(value: T | T[] | null | undefined): T[] =>
  value == null ? [] : Array.isArray(value) ? value : [value];

export const toStringArray = <T>(value: T | T[] | null): string[] => {
  if (value == null) return [];

  const arr = Array.isArray(value) ? value : [value];
  return arr.reduce<string[]>((acc, v) => {
    if (v == null) return acc;

    if (typeof v === 'object') {
      try {
        acc.push(JSON.stringify(v));
      } catch {
        acc.push('Invalid Object');
      }
      return acc;
    }

    acc.push(String(v));
    return acc;
  }, []);
};

export const toObjectArrayOfStrings = <T>(
  value: T | T[] | null
): Array<{
  str: string;
  isObjectArray?: boolean;
}> => {
  if (value == null) return [];

  const arr = Array.isArray(value) ? value : [value];
  return arr.reduce<Array<{ str: string; isObjectArray?: boolean }>>((acc, v) => {
    if (v == null) return acc;

    if (typeof v === 'object') {
      try {
        acc.push({
          str: JSON.stringify(v),
          isObjectArray: true,
        });
      } catch {
        acc.push({ str: 'Invalid Object' });
      }
      return acc;
    }

    acc.push({ str: String(v) });
    return acc;
  }, []);
};
