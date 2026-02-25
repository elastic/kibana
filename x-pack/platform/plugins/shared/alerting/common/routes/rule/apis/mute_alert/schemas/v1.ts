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
    schema.object({
      expires_at: schema.maybe(
        schema.string({
          meta: {
            description: 'ISO date after which the snooze expires. Absent = indefinite.',
          },
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
    })
  )
);
