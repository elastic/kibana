/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

export const muteConditionSchema = schema.object({
  type: schema.oneOf([
    schema.literal('severity_change'),
    schema.literal('severity_equals'),
    schema.literal('field_change'),
  ]),
  field: schema.string(),
  value: schema.maybe(schema.string()),
  snapshotValue: schema.maybe(schema.string()),
});

export const muteAlertQuerySchema = schema.object({
  validateAlertsExistence: schema.maybe(schema.boolean({ defaultValue: true })),
  /** ISO timestamp; when reached the mute expires automatically. */
  expiresAt: schema.maybe(schema.string()),
  /** Conditions under which the mute is automatically lifted. */
  conditions: schema.maybe(schema.arrayOf(muteConditionSchema)),
  /** How conditions (including time expiry) combine: 'any' = OR, 'all' = AND. Default 'any'. */
  conditionOperator: schema.maybe(
    schema.oneOf([schema.literal('any'), schema.literal('all')])
  ),
});
