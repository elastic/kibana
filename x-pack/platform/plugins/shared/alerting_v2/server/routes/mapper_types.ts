/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Makes every key of `T` required-*present* in an object literal while keeping
 * the original value types (so `undefined` values are still allowed). Use it as
 * a mapper's return type so that adding a field to the target type fails to
 * compile until the mapper explicitly writes it.
 */
export type Complete<T> = T & Record<keyof T, unknown>;

/**
 * Compile-time guard for a destructured request's `...rest`. Passing `rest`
 * forces every source field to be destructured (i.e. considered by the mapper):
 * a newly added field lands in `rest`, which is then no longer assignable to
 * `Record<string, never>` and fails to compile right at the mapper.
 */
export const assertAllFieldsMapped = (_rest: Record<string, never>): void => {
  // no-op: the parameter type is the compile-time guard.
};
