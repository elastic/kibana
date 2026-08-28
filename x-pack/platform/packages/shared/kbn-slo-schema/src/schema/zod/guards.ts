/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Type guard matching io-ts `.is()` semantics: it validates the DECODED side of a
 * schema, e.g. `is(durationType, value)` requires `value instanceof Duration` and
 * returns false for the `"30d"` wire form.
 */
export const is = <T extends z.ZodType>(schema: T, value: unknown): value is z.output<T> =>
  // `safeEncode` types its input as the decoded form, but a guard by definition
  // receives `unknown`; the runtime validation is exactly what the guard is for.
  z.safeEncode(schema, value as z.output<T>).success;
