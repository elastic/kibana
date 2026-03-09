/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { MAX_SNOOZE_CONDITIONS_PER_ENTRY } from '../../../../../constants';
import { snoozeConditionOperator } from '../../../common/constants/v1';

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

function validateExpiresAt(value: string): string | void {
  if (value.trim() === '') return;
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return 'expires_at must be a valid ISO 8601 date string';
  }
}

const muteAlertBodyConditionSchema = schema.object({
  type: schema.oneOf(
    [
      schema.literal('severity_change'),
      schema.literal('field_change'),
      schema.literal('severity_equals'),
    ],
    {
      meta: {
        description:
          'Condition type evaluated by the alerting framework: severity_change, field_change, severity_equals.',
      },
    }
  ),
  field: schema.string({
    meta: { description: 'The alert doc field to monitor.' },
  }),
  value: schema.maybe(
    schema.string({
      meta: { description: 'Target value for severity_equals.' },
    })
  ),
  snapshot_value: schema.maybe(
    schema.string({
      meta: { description: 'Snapshot at snooze time for severity_change/field_change.' },
    })
  ),
});

export const muteAlertBodySchema = schema.maybe(
  schema.nullable(
    schema.object(
      {
        expires_at: schema.maybe(
          schema.string({
            meta: {
              description: 'ISO date after which the snooze expires. Absent = indefinite.',
            },
            validate: validateExpiresAt,
          })
        ),
        conditions: schema.maybe(
          schema.arrayOf(muteAlertBodyConditionSchema, {
            maxSize: MAX_SNOOZE_CONDITIONS_PER_ENTRY,
            meta: { description: 'Conditions that auto-lift the snooze.' },
          })
        ),
        condition_operator: schema.maybe(
          schema.oneOf(
            [
              schema.literal(snoozeConditionOperator.ANY),
              schema.literal(snoozeConditionOperator.ALL),
            ],
            {
              meta: { description: 'How conditions combine: any (OR, default), all (AND).' },
            }
          )
        ),
      },
      {
        validate: (value) => {
          const hasExpiresAt = value.expires_at != null && value.expires_at !== '';
          const hasConditions = Array.isArray(value.conditions) && value.conditions.length > 0;
          const isEmptyBody = Object.keys(value).length === 0;
          // Empty object {} is allowed for indefinite mute (backward compatibility with clients that send empty JSON body).
          if (!isEmptyBody && !hasExpiresAt && !hasConditions) {
            return 'When providing a request body, at least one of expires_at or conditions (non-empty array) is required. Omit the body for indefinite mute.';
          }
          if (hasConditions) {
            for (const condition of value.conditions!) {
              if (
                (condition.type === 'field_change' || condition.type === 'severity_change') &&
                (!condition.snapshot_value || condition.snapshot_value.trim() === '')
              ) {
                return `Condition type '${condition.type}' requires a non-empty snapshot_value.`;
              }
              if (
                condition.type === 'severity_equals' &&
                (!condition.value || condition.value.trim() === '')
              ) {
                return `Condition type 'severity_equals' requires a non-empty value.`;
              }
            }
          }
        },
      }
    )
  )
);
