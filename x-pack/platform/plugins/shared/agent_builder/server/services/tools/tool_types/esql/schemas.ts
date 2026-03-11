/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const paramValueTypeSchema = schema.oneOf([
  schema.literal('string'),
  schema.literal('integer'),
  schema.literal('float'),
  schema.literal('boolean'),
  schema.literal('date'),
  schema.literal('array'),
]);

export const paramSchema = schema.object({
  type: paramValueTypeSchema,
  description: schema.string(),
  optional: schema.maybe(schema.boolean()),
  defaultValue: schema.conditional(
    schema.siblingRef('optional'),
    true,
    schema.maybe(
      schema.oneOf([
        schema.string(),
        schema.number(),
        schema.boolean(),
        schema.arrayOf(schema.oneOf([schema.string(), schema.number()]), { maxSize: 100 }),
      ])
    ),
    schema.never()
  ),
});

export const configurationSchema = schema.object({
  query: schema.string(),
  params: schema.recordOf(schema.string(), paramSchema),
});

export const configurationUpdateSchema = schema.object({
  query: schema.maybe(schema.string()),
  params: schema.maybe(schema.recordOf(schema.string(), paramSchema)),
});
