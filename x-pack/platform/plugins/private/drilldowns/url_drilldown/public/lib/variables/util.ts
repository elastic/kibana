/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type Primitive = string | number | boolean | null;

export const toPrimitiveOrUndefined = (v: unknown): Primitive | undefined => {
  if (typeof v === 'number' || typeof v === 'boolean' || typeof v === 'string' || v === null)
    return v;
  if (typeof v === 'object' && v instanceof Date) return v.toISOString();
  if (typeof v === 'undefined') return undefined;
  return String(v);
};

export const deleteUndefinedKeys = <T extends Record<string, unknown>>(obj: T): T => {
  Object.keys(obj).forEach((key) => {
    if (obj[key] === undefined) {
      delete obj[key];
    }
  });
  return obj;
};
