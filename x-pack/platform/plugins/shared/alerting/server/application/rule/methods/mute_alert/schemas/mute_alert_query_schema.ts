/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { schema } from '@kbn/config-schema';

/** Schema for a single condition that can trigger auto-unmute. */
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

/**
 * Internal (application-level) schema for mute alert parameters.
 * Combines the legacy `validateAlertsExistence` flag with the new
 * conditional-snooze fields (`expiresAt`, `conditions`, `conditionOperator`).
 */
export const muteAlertQuerySchema = schema.object({
  validateAlertsExistence: schema.maybe(schema.boolean({ defaultValue: true })),
  /** ISO timestamp; when reached the mute expires automatically. */
  expiresAt: schema.maybe(
    schema.string({
      validate(value) {
        const date = new Date(value);
        if (isNaN(date.getTime())) {
          return 'must be a valid ISO 8601 date string';
        }
        if (date.getTime() <= Date.now()) {
          return 'must be a date in the future';
        }
      },
    })
  ),
  /** Conditions under which the mute is automatically lifted. */
  conditions: schema.maybe(schema.arrayOf(muteConditionSchema)),
  /** How conditions (including time expiry) combine: 'any' = OR, 'all' = AND. Default 'any'. */
  conditionOperator: schema.maybe(schema.oneOf([schema.literal('any'), schema.literal('all')])),
});
