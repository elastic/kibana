/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const rawRulesSettingsSchema = schema.object({
  flapping: schema.maybe(
    schema.object({
      createdAt: schema.string(),
      createdBy: schema.nullable(schema.string()),
      enabled: schema.boolean(),
      lookBackWindow: schema.number(),
      statusChangeThreshold: schema.number(),
      updatedAt: schema.string(),
      updatedBy: schema.nullable(schema.string()),
    })
  ),
  queryDelay: schema.maybe(
    schema.object({
      createdAt: schema.string(),
      createdBy: schema.nullable(schema.string()),
      delay: schema.number(),
      updatedAt: schema.string(),
      updatedBy: schema.nullable(schema.string()),
    })
  ),
});
