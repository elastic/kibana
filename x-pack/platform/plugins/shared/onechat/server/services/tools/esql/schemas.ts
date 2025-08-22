/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const paramValueTypeSchema = schema.oneOf([
  schema.literal('text'),
  schema.literal('keyword'),
  schema.literal('long'),
  schema.literal('integer'),
  schema.literal('double'),
  schema.literal('float'),
  schema.literal('boolean'),
  schema.literal('date'),
  schema.literal('object'),
  schema.literal('nested'),
]);

export const paramSchema = schema.object({
  type: paramValueTypeSchema,
  description: schema.string(),
});

export const configurationSchema = schema.object({
  query: schema.string(),
  params: schema.recordOf(schema.string(), paramSchema),
});

export const configurationUpdateSchema = schema.object({
  query: schema.maybe(schema.string()),
  params: schema.maybe(schema.recordOf(schema.string(), paramSchema)),
});
