/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

/** Path parameters for the mute alert API endpoint. */
export const muteAlertParamsSchema = schema.object({
  rule_id: schema.string({
    meta: {
      description: 'The identifier for the rule.',
    },
  }),
  alert_id: schema.string({
    meta: {
      description: 'The identifier for the alert.',
    },
  }),
});

/** Query parameters for the mute alert API endpoint. */
export const muteAlertQuerySchema = schema.maybe(
  schema.object({
    validate_alerts_existence: schema.maybe(
      schema.boolean({
        defaultValue: true,
        meta: {
          description: 'Whether to validate the existence of the alert.',
        },
      })
    ),
  })
);

const muteConditionSchema = schema.object({
  type: schema.oneOf([
    schema.literal('severity_change'),
    schema.literal('severity_equals'),
    schema.literal('field_change'),
  ]),
  field: schema.string({
    meta: { description: 'The alert document field to monitor (e.g. kibana.alert.severity).' },
  }),
  value: schema.maybe(
    schema.string({
      meta: { description: 'For severity_equals: the target value that triggers unmute.' },
    })
  ),
  snapshot_value: schema.maybe(
    schema.string({
      meta: { description: 'Snapshot of the field value at the time the mute was created.' },
    })
  ),
});

/**
 * Optional request body for the mute alert API endpoint.
 * When provided, creates a conditional snooze with time-based expiry
 * and/or field-change conditions.
 */
export const muteAlertBodySchema = schema.maybe(
  schema.object({
    expires_at: schema.maybe(
      schema.string({
        meta: {
          description:
            'ISO timestamp after which the mute expires automatically. Absent means indefinite.',
        },
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
    conditions: schema.maybe(
      schema.arrayOf(muteConditionSchema, {
        meta: {
          description: 'Conditions under which the mute is automatically lifted.',
        },
      })
    ),
    condition_operator: schema.maybe(
      schema.oneOf([schema.literal('any'), schema.literal('all')], {
        meta: {
          description:
            "How conditions combine with time expiry: 'any' = OR (first met wins), 'all' = AND.",
        },
      })
    ),
  })
);
