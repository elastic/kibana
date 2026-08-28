/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';

/**
 * Type guard matching io-ts `.is()` semantics: it validates the DECODED side of a
 * schema, e.g. `is(durationType, value)` requires `value instanceof Duration` and
 * returns false for the `"30d"` wire form.
 *
 * Runs the same backward-direction check as `z.safeEncode`, but only counts the
 * issues: guards run at high frequency and often fail by design (union
 * narrowing), and `safeEncode` would materialize a full `ZodError` — per-issue
 * finalization plus stack capture — that no guard caller ever reads.
 */
export const is = <T extends z.ZodType>(schema: T, value: unknown): value is z.output<T> => {
  const result = schema._zod.run({ value, issues: [] }, { direction: 'backward', async: false });
  if (result instanceof Promise) {
    throw new Error('is() does not support schemas with async refinements');
  }
  return result.issues.length === 0;
};
