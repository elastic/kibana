/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getObjectShape = (schema: unknown): Record<string, z.ZodType> | undefined => {
  if (typeof schema !== 'object' || schema === null || !('shape' in schema)) {
    return undefined;
  }
  const { shape } = schema;
  return isRecord(shape) ? (shape as Record<string, z.ZodType>) : undefined;
};

// A field with async refinements makes the sync `safeParse` throw. Treat it as accepting `null`
// so the key is kept and normal validation reports the real outcome.
const acceptsNull = (field: z.ZodType): boolean => {
  try {
    return field.safeParse(null).success;
  } catch {
    return true;
  }
};

/**
 * Shape-level counterpart of `omitNullForOptionalParams`, for validators that run before our code
 * (e.g. the MCP SDK validating `inputSchema`): wraps each optional field that rejects `null` so
 * `null` is read as `undefined`. Other fields are returned as is.
 */
export const allowNullForOptionalFields = (
  shape: Record<string, z.ZodType>
): Record<string, z.ZodType> =>
  Object.fromEntries(
    Object.entries(shape).map(([key, field]) => [
      key,
      field.isOptional() && !acceptsNull(field)
        ? z.preprocess((value) => (value === null ? undefined : value), field)
        : field,
    ])
  );

/**
 * Some models (e.g. OpenAI with strict function calling) send `null` for every optional
 * argument they do not use. Zod's `.optional()` rejects `null`, so such calls would fail validation.
 *
 * Drops the top-level keys of `params` that are `null` when the matching schema field is optional
 * and does not itself accept `null`. Required fields and fields accepting `null`
 * (`.nullable()` / `.nullish()`) are left untouched, so genuine errors are not masked.
 * Nested objects are not traversed.
 */
export const omitNullForOptionalParams = <T>(schema: z.ZodType, params: T): T => {
  if (!isRecord(params)) {
    return params;
  }
  const shape = getObjectShape(schema);
  if (!shape) {
    return params;
  }

  const nullKeys = Object.keys(params).filter((key) => {
    const field = shape[key];
    return params[key] === null && field && field.isOptional() && !acceptsNull(field);
  });
  if (nullKeys.length === 0) {
    return params;
  }

  const result = { ...params };
  for (const key of nullKeys) {
    delete result[key];
  }
  return result;
};
