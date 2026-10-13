/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isZod, z } from '@kbn/zod';
import { isRight } from 'fp-ts/Either';
import type * as t from 'io-ts';
import { is as isZodDecodedForm } from '../schema/zod/guards';

export type DecodeOutcome<T> = { success: true; value: T } | { success: false; errors: unknown };

/**
 * Decodes an input with either an io-ts codec or a zod schema, so characterization
 * tests written against the io-ts codecs keep passing unchanged once the schemas
 * are migrated to zod.
 */
export function decode<A, O>(codec: t.Type<A, O, unknown>, input: unknown): DecodeOutcome<A>;
export function decode<S extends z.ZodType>(codec: S, input: unknown): DecodeOutcome<z.output<S>>;
export function decode(codec: t.Any | z.ZodType, input: unknown): DecodeOutcome<unknown> {
  if (isZod(codec)) {
    const result = codec.safeParse(input);
    return result.success
      ? { success: true, value: result.data }
      : { success: false, errors: result.error.issues };
  }

  const result = codec.decode(input);
  return isRight(result)
    ? { success: true, value: result.right }
    : { success: false, errors: result.left };
}

/** Encodes a decoded value back to its wire representation with either codec kind. */
export function encode<A, O>(codec: t.Type<A, O, unknown>, value: A): O;
export function encode<S extends z.ZodType>(codec: S, value: z.output<S>): z.input<S>;
export function encode(codec: t.Any | z.ZodType, value: unknown): unknown {
  if (isZod(codec)) {
    return z.encode(codec, value);
  }

  return codec.encode(value);
}

/**
 * Type guard matching io-ts `.is()` semantics: validates the DECODED side, e.g.
 * requires `duration instanceof Duration` rather than the `"30d"` wire form.
 */
export function is<A, O>(codec: t.Type<A, O, unknown>, value: unknown): value is A;
export function is<S extends z.ZodType>(codec: S, value: unknown): value is z.output<S>;
export function is(codec: t.Any | z.ZodType, value: unknown): boolean {
  if (isZod(codec)) {
    // Delegates to the production guard so the characterization tests exercise
    // the exact implementation consumers will use, not a parallel copy.
    return isZodDecodedForm(codec, value);
  }

  return codec.is(value);
}
