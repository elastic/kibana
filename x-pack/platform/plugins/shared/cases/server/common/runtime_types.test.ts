/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';

import { decodeOrThrowZod, decodeWithExcessOrThrowZod } from './runtime_types';

describe('runtime_types', () => {
  describe('decodeWithExcessOrThrowZod', () => {
    it('does not throw when all required fields are present', () => {
      const schema = z.object({ a: z.string() });
      expect(() => decodeWithExcessOrThrowZod(schema)({ a: 'hi' })).not.toThrow();
    });

    it('throws Boom 400 when a required field is missing', () => {
      const schema = z.object({ a: z.string() });
      expect(() => decodeWithExcessOrThrowZod(schema)({})).toThrow(
        expect.objectContaining({
          isBoom: true,
          output: expect.objectContaining({ statusCode: 400 }),
        })
      );
    });

    it('throws when an excess field exists at the top level', () => {
      const schema = z.object({ a: z.string() });
      expect(() =>
        decodeWithExcessOrThrowZod(schema)({ a: 'hi', b: 1 })
      ).toThrowErrorMatchingInlineSnapshot(`"Excess keys are not allowed"`);
    });

    it('throws when a nested excess field exists', () => {
      const schema = z.object({ a: z.object({ b: z.string() }) });
      expect(() =>
        decodeWithExcessOrThrowZod(schema)({ a: { b: 'hi', c: 1 } })
      ).toThrowErrorMatchingInlineSnapshot(`"Excess keys are not allowed"`);
    });

    it('returns the parsed object on success', () => {
      const schema = z.object({ a: z.string() });
      expect(decodeWithExcessOrThrowZod(schema)({ a: 'hi' })).toStrictEqual({ a: 'hi' });
    });

    it('throws when an excess field exists inside an array of objects', () => {
      const schema = z.object({ items: z.array(z.object({ a: z.string() })) });
      expect(() =>
        decodeWithExcessOrThrowZod(schema)({ items: [{ a: 'hi' }, { a: 'hi', b: 1 }] })
      ).toThrowErrorMatchingInlineSnapshot(`"Excess keys are not allowed"`);
    });

    it('throws when an excess field exists inside a union variant', () => {
      const schema = z.object({
        payload: z.union([
          z.object({ kind: z.literal('a'), value: z.string() }),
          z.object({ kind: z.literal('b') }),
        ]),
      });
      expect(() =>
        decodeWithExcessOrThrowZod(schema)({ payload: { kind: 'a', value: 'hi', extra: 1 } })
      ).toThrowErrorMatchingInlineSnapshot(`"Excess keys are not allowed"`);
    });

    it('throws when an excess field exists inside a discriminated union variant', () => {
      const schema = z.object({
        payload: z.discriminatedUnion('kind', [
          z.object({ kind: z.literal('a'), value: z.string() }),
          z.object({ kind: z.literal('b') }),
        ]),
      });
      expect(() =>
        decodeWithExcessOrThrowZod(schema)({ payload: { kind: 'a', value: 'hi', extra: 1 } })
      ).toThrowErrorMatchingInlineSnapshot(`"Excess keys are not allowed"`);
    });
  });

  describe('decodeOrThrowZod', () => {
    it('returns the parsed value on success', () => {
      const schema = z.object({ a: z.string() });
      expect(decodeOrThrowZod(schema)({ a: 'hi' })).toStrictEqual({ a: 'hi' });
    });

    it('strips unknown keys silently (no throw)', () => {
      const schema = z.object({ a: z.string() });
      expect(decodeOrThrowZod(schema)({ a: 'hi', b: 1 })).toStrictEqual({ a: 'hi' });
    });

    it('throws when a required field is missing', () => {
      const schema = z.object({ a: z.string() });
      expect(() => decodeOrThrowZod(schema)({})).toThrowErrorMatchingInlineSnapshot(
        `"a: Invalid input: expected string, received undefined"`
      );
    });

    it('uses the provided error factory', () => {
      const schema = z.object({ a: z.string() });
      class CustomError extends Error {}
      expect(() => decodeOrThrowZod(schema, (m) => new CustomError(m))({})).toThrow(CustomError);
    });
  });
});
