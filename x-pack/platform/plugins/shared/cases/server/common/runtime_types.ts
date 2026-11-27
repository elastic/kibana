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
 * Parses `value` with `schema` and throws `createError` when it fails. Unknown keys are stripped;
 * use `decodeWithExcessOrThrowZod` to reject them.
 */
export const decodeOrThrowZod =
  <T>(schema: ZodType<T>, createError: ErrorFactory = createPlainError) =>
  (value: unknown): T => {
    const result = schema.safeParse(value);
    if (result.success) return result.data;
    throw createError(stringifyZodError(result.error));
  };

/**
 * Parses `value` with `schema` and throws a 400 when it fails or has unknown keys at any depth.
 * Use it for request bodies and query strings.
 */
export const decodeWithExcessOrThrowZod =
  <T>(schema: ZodType<T>) =>
  (value: unknown): T => {
    const result = DeepStrict(schema).safeParse(value);
    if (result.success) return result.data as T;
    throw badRequest(stringifyZodError(result.error));
  };
