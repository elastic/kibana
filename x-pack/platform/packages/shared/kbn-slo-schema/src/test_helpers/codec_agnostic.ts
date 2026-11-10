/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod';
import { is as isDecodedForm } from '../schema/guards';

export type DecodeOutcome<T> = { success: true; value: T } | { success: false; errors: unknown };

/** Decodes an input with a zod schema into a success/failure outcome. */
export function decode<S extends z.ZodType>(codec: S, input: unknown): DecodeOutcome<z.output<S>> {
  const result = codec.safeParse(input);
  return result.success
    ? { success: true, value: result.data }
    : { success: false, errors: result.error.issues };
}

/** Encodes a decoded value back to its wire representation. */
export function encode<S extends z.ZodType>(codec: S, value: z.output<S>): z.input<S> {
  return z.encode(codec, value);
}

/**
 * Type guard on the DECODED side, e.g. requires `duration instanceof Duration`
 * rather than the `"30d"` wire form.
 */
export function is<S extends z.ZodType>(codec: S, value: unknown): value is z.output<S> {
  // Delegates to the production guard so the characterization tests exercise
  // the exact implementation consumers use, not a parallel copy.
  return isDecodedForm(codec, value);
}
