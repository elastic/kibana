/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod/v4';

export function createIsNarrowSchema<
  TBaseSchema extends z.ZodType,
  TNarrowSchema extends z.ZodType
>(_base: TBaseSchema, narrow: TNarrowSchema) {
  return <TValue extends z.output<TBaseSchema>>(
    value: TValue
  ): value is Extract<TValue, z.output<TNarrowSchema>> => {
    return isSchema(narrow, value);
  };
}

export function createAsSchemaOrThrow<
  TBaseSchema extends z.ZodType,
  TNarrowSchema extends z.ZodType
>(_base: TBaseSchema, narrow: TNarrowSchema) {
  return <TValue extends z.output<TBaseSchema>>(
    value: TValue
  ): Extract<TValue, z.output<TNarrowSchema>> => {
    narrow.parse(value);
    return value as Extract<TValue, z.output<TNarrowSchema>>;
  };
}

export function isSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  value: unknown
): value is z.output<TSchema> {
  return schema.safeParse(value).success;
}

export function assertsSchema<TSchema extends z.ZodType>(
  schema: TSchema,
  subject: any
): asserts subject is z.output<TSchema> {
  schema.parse(subject);
}
