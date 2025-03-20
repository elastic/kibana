/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

export const queryDelaySettingsResponseBodySchema = schema.object({
  delay: schema.number(),
  created_by: schema.nullable(schema.string()),
  updated_by: schema.nullable(schema.string()),
  created_at: schema.string(),
  updated_at: schema.string(),
});

export const queryDelaySettingsResponseSchema = schema.object({
  body: queryDelaySettingsResponseBodySchema,
});

export const alertDeletionSettingsResponseBodySchema = schema.object({
  active_alerts_deletion_threshold: schema.number({ min: 1, max: 1000 }),
  is_active_alerts_deletion_enabled: schema.boolean(),
  inactive_alerts_deletion_threshold: schema.number({ min: 1, max: 1000 }),
  is_inactive_alerts_deletion_enabled: schema.boolean(),
  category_ids: schema.maybe(schema.arrayOf(schema.string())),
  created_at: schema.string(),
  created_by: schema.nullable(schema.string()),
  updated_at: schema.string(),
  updated_by: schema.nullable(schema.string()),
});

export const alertDeletionSettingsResponseSchema = schema.object({
  body: alertDeletionSettingsResponseBodySchema,
});
