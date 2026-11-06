/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ZodObject } from '@kbn/zod/v4';

/** Unwrap ZodOptional / ZodDefault / ZodNullable to the inner type. */
const unwrapZodType = (type: any): any => {
  let t = type;
  while (t?.def && ['optional', 'default', 'nullable'].includes(t.def.type)) {
    t = t.def.innerType;
  }
  return t;
};

/**
 * Coerce a raw CLI string value to the declared type of `key` in `schema`
 * (top-level fields only). A bare flag (`rawValue === undefined`) is `true`
 * for boolean fields and an error otherwise. Unknown keys fall back to
 * best-effort JSON parsing, then raw string. Throws with a user-facing
 * message on coercion failure.
 */
export const coerceParamValue = (
  schema: ZodObject<any>,
  key: string,
  rawValue: string | undefined
): unknown => {
  const field = schema.shape[key];
  const fieldType = field ? unwrapZodType(field) : undefined;
  const kind: string | undefined = fieldType?.def?.type;

  if (rawValue === undefined) {
    if (kind === 'boolean') return true;
    throw new Error(`--${key} requires a value`);
  }

  if (!fieldType) {
    try {
      return JSON.parse(rawValue);
    } catch {
      return rawValue;
    }
  }

  switch (kind) {
    case 'number': {
      const n = Number(rawValue);
      if (Number.isNaN(n)) {
        throw new Error(`--${key} expects a number, got '${rawValue}'`);
      }
      return n;
    }
    case 'boolean': {
      if (rawValue === 'true') return true;
      if (rawValue === 'false') return false;
      throw new Error(`--${key} expects a boolean (true|false), got '${rawValue}'`);
    }
    case 'array':
    case 'object': {
      try {
        return JSON.parse(rawValue);
      } catch {
        throw new Error(`--${key} expects JSON ${kind}, got invalid JSON: '${rawValue}'`);
      }
    }
    default:
      return rawValue;
  }
};
