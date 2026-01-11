/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/**
 * Attributes for the ES|QL rule saved object.
 *
 */
export const ruleSavedObjectAttributesSchema = schema.object({
  name: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  schedule: schema.object({
    custom: schema.string(),
  }),
  enabled: schema.boolean({ defaultValue: true }),

  query: schema.string(),
  timeField: schema.string(),
  lookbackWindow: schema.string(),
  groupingKey: schema.arrayOf(schema.string(), { defaultValue: [] }),

  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  updatedAt: schema.string(),
  createdAt: schema.string(),
});
