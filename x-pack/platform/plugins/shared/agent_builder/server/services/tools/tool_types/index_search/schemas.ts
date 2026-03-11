/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const configurationSchema = schema.object({
  pattern: schema.string(),
  row_limit: schema.maybe(schema.number({ min: 1 })),
  custom_instructions: schema.maybe(schema.string()),
});

export const configurationUpdateSchema = schema.object({
  pattern: schema.maybe(schema.string()),
  row_limit: schema.maybe(schema.number({ min: 1 })),
  custom_instructions: schema.maybe(schema.string()),
});
