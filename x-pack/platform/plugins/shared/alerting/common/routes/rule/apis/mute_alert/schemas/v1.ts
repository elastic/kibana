/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const isoDateStringSchema = schema.string({
  validate: (value) =>
    Number.isNaN(Date.parse(value)) ? 'must be a valid ISO 8601 date string' : undefined,
});

const snoozeConditionSchema = schema.oneOf([
  schema.object({
    type: schema.literal('field_change'),
    field: schema.string(),
  }),
  schema.object({
    type: schema.literal('severity_change'),
  }),
  schema.object({
    type: schema.literal('severity_equals'),
    value: schema.oneOf([
      schema.literal('critical'),
      schema.literal('high'),
      schema.literal('medium'),
      schema.literal('low'),
      schema.literal('info'),
    ]),
  }),
]);

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

export const muteAlertBodySchema = schema.object(
  {
    expires_at: schema.maybe(isoDateStringSchema),
    conditions: schema.maybe(schema.arrayOf(snoozeConditionSchema)),
    condition_operator: schema.maybe(schema.oneOf([schema.literal('any'), schema.literal('all')])),
  },
  {
    validate: (value) => {
      if (value.condition_operator !== undefined && value.conditions === undefined) {
        return '[condition_operator] requires [conditions]';
      }

      if (value.expires_at === undefined && value.conditions === undefined) {
        return 'either [expires_at] or [conditions] must be provided';
      }

      if (value.conditions !== undefined && value.conditions.length === 0) {
        return '[conditions] must contain at least one condition';
      }
    },
  }
);
