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
 * Shape mirrors the external API contract (string schedule, esql, etc) and
 * includes internal fields needed for task scheduling and credentials.
 */
export const rawEsqlRuleSchema = schema.object({
  name: schema.string(),
  tags: schema.arrayOf(schema.string(), { defaultValue: [] }),
  schedule: schema.string(),
  enabled: schema.boolean({ defaultValue: true }),

  esql: schema.string(),
  timeField: schema.string(),
  lookbackWindow: schema.string(),
  groupKey: schema.arrayOf(schema.string(), { defaultValue: [] }),

  apiKey: schema.nullable(schema.string()),
  apiKeyOwner: schema.nullable(schema.string()),
  apiKeyCreatedByUser: schema.maybe(schema.nullable(schema.boolean())),

  scheduledTaskId: schema.maybe(schema.nullable(schema.string())),

  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  updatedAt: schema.string(),
  createdAt: schema.string(),
});
