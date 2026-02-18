/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

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

const snoozeConditionSchema = schema.object(
  {
    type: schema.oneOf(
      [
        schema.literal('severity_change'),
        schema.literal('severity_equals'),
        schema.literal('field_change'),
      ],
      {
        meta: {
          description:
            "The kind of condition: 'severity_change' unmutes when the value differs from the snapshot, 'severity_equals' unmutes when the value matches a target, 'field_change' unmutes when any monitored field changes.",
        },
      }
    ),
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
        meta: { description: 'Snapshot of the field value at the time the snooze was created.' },
      })
    ),
  },
  {
    validate(value) {
      if (value.type === 'severity_equals' && value.value === undefined) {
        return '`value` is required when condition type is `severity_equals`';
      }
      if (
        (value.type === 'severity_change' || value.type === 'field_change') &&
        value.snapshot_value === undefined
      ) {
        return '`snapshot_value` is required when condition type is `severity_change` or `field_change`';
      }
    },
  }
);

/**
 * Optional request body for the mute alert API endpoint.
 * When provided, creates a conditional per-alert snooze with time-based expiry
 * and/or field-change conditions. When absent, behaves as a simple indefinite mute.
 */
export const muteAlertBodySchema = schema.nullable(
  schema.object(
    {
      expires_at: schema.maybe(
        schema.string({
          meta: {
            description:
              'ISO timestamp after which the snooze expires automatically. Absent means indefinite.',
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
        schema.arrayOf(snoozeConditionSchema, {
          minSize: 1,
          meta: {
            description: 'Conditions under which the snooze is automatically lifted.',
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
    },
    {
      validate(value) {
        const hasConditions = value.conditions !== undefined;
        const hasOperator = value.condition_operator !== undefined;

        if (hasOperator && !hasConditions) {
          return '`condition_operator` can only be used when `conditions` are provided';
        }
      },
    }
  )
);
