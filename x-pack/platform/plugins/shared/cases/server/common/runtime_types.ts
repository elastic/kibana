/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { badRequest } from '@hapi/boom';
import type { ZodType } from '@kbn/zod/v4';
import { DeepStrict, stringifyZodError } from '@kbn/zod-helpers';

type ErrorFactory = (message: string) => Error;

export const createPlainError = (message: string) => new Error(message);

/**
 * Zod equivalent of `decodeOrThrow` from `./runtime_types`. Parses input
 * against the provided schema and throws (via `createError`) when the input
 * fails validation. Unknown keys are silently stripped — matching io-ts's
 * `decodeOrThrow` behavior on `rt.exact` schemas. (`rt.strict` rejected
 * excess keys; for that behavior use `decodeWithExcessOrThrowZod`.)
 */
export const decodeOrThrowZod =
  <T>(schema: ZodType<T>, createError: ErrorFactory = createPlainError) =>
  (value: unknown): T => {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    throw createError(stringifyZodError(result.error));
  };

/**
 * Zod equivalent of `decodeWithExcessOrThrow` from `./runtime_types`. Wraps
 * the schema with `DeepStrict` so any unrecognized keys (at any depth) cause
 * validation to fail with `Boom.badRequest` — matching io-ts's `exactCheck`
 * behavior. Use this for incoming request bodies / query strings where
 * extra keys should be rejected.
 */
export const decodeWithExcessOrThrowZod =
  <T>(schema: ZodType<T>) =>
  (value: unknown): T => {
    const result = DeepStrict(schema).safeParse(value);
    if (result.success) return result.data as T;
    throw badRequest(stringifyZodError(result.error));
  };
