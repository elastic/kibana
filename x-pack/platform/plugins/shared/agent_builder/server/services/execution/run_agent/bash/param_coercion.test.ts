/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { coerceParamValue } from './param_coercion';

const schema = z.object({
  query: z.string(),
  limit: z.number().optional(),
  verbose: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  opts: z.object({ a: z.number() }).nullable(),
  mode: z.enum(['fast', 'slow']),
});

describe('coerceParamValue', () => {
  it('keeps string and enum fields as raw strings', () => {
    expect(coerceParamValue(schema, 'query', 'hello')).toBe('hello');
    expect(coerceParamValue(schema, 'mode', 'fast')).toBe('fast');
  });

  it('coerces number fields', () => {
    expect(coerceParamValue(schema, 'limit', '5')).toBe(5);
  });

  it('coerces boolean fields from true/false strings', () => {
    expect(coerceParamValue(schema, 'verbose', 'true')).toBe(true);
    expect(coerceParamValue(schema, 'verbose', 'false')).toBe(false);
  });

  it('parses array and object fields as JSON', () => {
    expect(coerceParamValue(schema, 'tags', '["a","b"]')).toEqual(['a', 'b']);
    expect(coerceParamValue(schema, 'opts', '{"a":1}')).toEqual({ a: 1 });
  });

  it('unwraps optional / default / nullable wrappers to the inner type', () => {
    // limit is optional(number), verbose is default(boolean), opts is nullable(object)
    expect(coerceParamValue(schema, 'limit', '42')).toBe(42);
    expect(coerceParamValue(schema, 'verbose', 'true')).toBe(true);
    expect(coerceParamValue(schema, 'opts', '{"a":2}')).toEqual({ a: 2 });
  });

  it('treats a bare flag (undefined value) as true for boolean fields', () => {
    expect(coerceParamValue(schema, 'verbose', undefined)).toBe(true);
  });

  it('throws for a bare flag on a non-boolean field', () => {
    expect(() => coerceParamValue(schema, 'query', undefined)).toThrow(/requires a value/);
  });

  it('falls back to JSON-then-string for keys not in the schema', () => {
    expect(coerceParamValue(schema, 'unknown', '7')).toBe(7);
    expect(coerceParamValue(schema, 'unknown', 'raw')).toBe('raw');
    expect(coerceParamValue(schema, 'unknown', '{"x":1}')).toEqual({ x: 1 });
  });

  it('throws on a non-numeric value for a number field', () => {
    expect(() => coerceParamValue(schema, 'limit', 'abc')).toThrow(/number/);
  });

  it('throws on a non-boolean value for a boolean field', () => {
    expect(() => coerceParamValue(schema, 'verbose', 'maybe')).toThrow(/boolean/);
  });

  it('throws on invalid JSON for array/object fields', () => {
    expect(() => coerceParamValue(schema, 'tags', '[bad')).toThrow(/JSON/);
    expect(() => coerceParamValue(schema, 'opts', '{bad')).toThrow(/JSON/);
  });
});
