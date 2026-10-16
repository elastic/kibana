/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const esqlColumnSchema = schema.object({
  name: schema.string({ maxLength: 10000 }),
  type: schema.string({ maxLength: 10000 }),
  hasConflict: schema.literal(false),
  userDefined: schema.literal(false),
});

export const getEsqlColumnsRequestSchema = schema.object({
  query: schema.string({
    minLength: 1,
    maxLength: 1_000_000,
    validate: (query) => (query.trim().length === 0 ? 'query must not be blank' : undefined),
  }),
});

export const getEsqlColumnsResponseSchema = () =>
  schema.object({
    columns: schema.arrayOf(esqlColumnSchema, { maxSize: 10000 }),
  });
