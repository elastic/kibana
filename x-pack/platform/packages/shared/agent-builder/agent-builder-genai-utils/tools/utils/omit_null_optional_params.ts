/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getObjectShape = (schema: unknown): Record<string, z.ZodType> | undefined => {
  if (typeof schema !== 'object' || schema === null || !('shape' in schema)) {
    return undefined;
  }
  const { shape } = schema;
  return isRecord(shape) ? (shape as Record<string, z.ZodType>) : undefined;
};

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
    return params[key] === null && field && field.isOptional() && !field.safeParse(null).success;
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
