/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';

/**
 * Type guard that validates the DECODED (output) side of a schema, e.g.
 * `is(durationType, value)` requires `value instanceof Duration` and returns false
 * for the `"30d"` wire form.
 *
 * It runs `z.safeEncode`, so for codecs the encoded value is also re-checked against
 * the input-side bounds: a decoded value whose wire form exceeds a `.max()` returns
 * false. Schemas with a unidirectional `.transform()` throw a `$ZodEncodeError`, and
 * schemas with async refinements throw a `$ZodAsyncError`.
 */
export const is = <T extends z.ZodType>(schema: T, value: unknown): value is z.output<T> =>
  z.safeEncode(schema, value as z.output<T>).success;
