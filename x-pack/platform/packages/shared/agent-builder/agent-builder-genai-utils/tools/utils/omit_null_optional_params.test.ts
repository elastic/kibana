/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { allowNullForOptionalFields, omitNullForOptionalParams } from './omit_null_optional_params';

describe('omitNullForOptionalParams', () => {
  const schema = z.object({
    required: z.string(),
    optional: z.array(z.string()).optional(),
    nullable: z.string().nullable(),
    nullish: z.string().nullish(),
    withDefault: z.number().default(5),
  });

  it('drops null values of optional fields', () => {
    const result = omitNullForOptionalParams(schema, { required: 'a', optional: null });
    expect(result).toEqual({ required: 'a' });
    expect(result).not.toHaveProperty('optional');
  });

  it('drops null for a field with a default so the default applies', () => {
    const result = omitNullForOptionalParams(schema, {
      required: 'a',
      nullable: null,
      withDefault: null,
    });
    expect(result).not.toHaveProperty('withDefault');
    expect(schema.safeParse(result).data).toMatchObject({ withDefault: 5 });
  });

  it('keeps null for required fields so validation still fails', () => {
    const result = omitNullForOptionalParams(schema, { required: null, nullable: null });
    expect(result).toEqual({ required: null, nullable: null });
    expect(schema.safeParse(result).success).toBe(false);
  });

  it('keeps null for fields that accept null', () => {
    const result = omitNullForOptionalParams(schema, {
      required: 'a',
      nullable: null,
      nullish: null,
    });
    expect(result).toEqual({ required: 'a', nullable: null, nullish: null });
  });

  it('leaves non-null values untouched', () => {
    const params = { required: 'a', optional: ['x'], nullable: 'b', nullish: 'c', withDefault: 1 };
    expect(omitNullForOptionalParams(schema, params)).toBe(params);
  });

  it('leaves absent and undefined values unchanged', () => {
    const params = { required: 'a', nullable: 'b', optional: undefined };
    expect(omitNullForOptionalParams(schema, params)).toBe(params);
  });

  it('does not mutate the input', () => {
    const params = { required: 'a', nullable: 'b', optional: null };
    omitNullForOptionalParams(schema, params);
    expect(params).toEqual({ required: 'a', nullable: 'b', optional: null });
  });

  it('ignores keys that are not in the schema', () => {
    const params = { required: 'a', nullable: 'b', unknownKey: null };
    expect(omitNullForOptionalParams(schema, params)).toBe(params);
  });

  it('keeps the key instead of throwing when the field has an async refinement', () => {
    const asyncSchema = z.object({
      checked: z
        .string()
        .nullable()
        .refine(async () => true)
        .optional(),
    });
    const params = { checked: null };

    // the sync probe throws here: null passes the type check and reaches the async refinement
    expect(() => asyncSchema.shape.checked.safeParse(null)).toThrow();
    expect(() => omitNullForOptionalParams(asyncSchema, params)).not.toThrow();
    expect(omitNullForOptionalParams(asyncSchema, params)).toEqual({ checked: null });
  });

  it('returns non-object params and non-object schemas as is', () => {
    expect(omitNullForOptionalParams(schema, null)).toBeNull();
    expect(omitNullForOptionalParams(schema, ['a'])).toEqual(['a']);
    const params = { a: null };
    expect(omitNullForOptionalParams(z.string(), params)).toBe(params);
  });
});

describe('allowNullForOptionalFields', () => {
  const schema = z.object({
    required: z.string(),
    optional: z.array(z.string()).describe('some items').optional(),
    nullable: z.string().nullable(),
    nullish: z.string().nullish(),
  });
  const wrapped = z.object(allowNullForOptionalFields(schema.shape));

  it('accepts null for optional fields and yields undefined', () => {
    const result = wrapped.safeParse({ required: 'a', nullable: null, optional: null });
    expect(result.success).toBe(true);
    expect(result.data).toEqual({ required: 'a', nullable: null });
    expect(result.data).not.toHaveProperty('optional', null);
  });

  it('still rejects null for required fields', () => {
    expect(wrapped.safeParse({ required: null, nullable: null }).success).toBe(false);
  });

  it('keeps null for fields that accept null', () => {
    expect(wrapped.parse({ required: 'a', nullable: null, nullish: null })).toEqual({
      required: 'a',
      nullable: null,
      nullish: null,
    });
  });

  it('leaves the input JSON schema identical', () => {
    expect(z.toJSONSchema(wrapped, { io: 'input' })).toEqual(
      z.toJSONSchema(schema, { io: 'input' })
    );
  });
});
