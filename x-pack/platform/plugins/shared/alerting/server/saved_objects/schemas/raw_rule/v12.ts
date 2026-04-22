/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  ALLOWED_MAX_ALERTS,
  MAX_SNOOZED_INSTANCE_CONDITIONS,
  MAX_SNOOZED_INSTANCE_ID_LENGTH,
  MAX_SNOOZED_BY_LENGTH,
  MAX_SNOOZED_CONDITION_FIELD_LENGTH,
} from '../../../../common/max_alert_limit';
import { isoDateSchema } from '../../../application/rule/schemas/date_schema';
import { rawRuleSchema as rawRuleSchemaV11 } from './v11';

const rawRuleSnoozeConditionSchema = schema.oneOf([
  schema.object({
    type: schema.literal('field_change'),
    field: schema.string({ maxLength: MAX_SNOOZED_CONDITION_FIELD_LENGTH }),
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

export const rawRuleSnoozedInstanceSchema = schema.object({
  instanceId: schema.string({ maxLength: MAX_SNOOZED_INSTANCE_ID_LENGTH }),
  expiresAt: schema.maybe(isoDateSchema),
  conditions: schema.maybe(
    schema.arrayOf(rawRuleSnoozeConditionSchema, { maxSize: MAX_SNOOZED_INSTANCE_CONDITIONS })
  ),
  conditionOperator: schema.maybe(schema.oneOf([schema.literal('any'), schema.literal('all')])),
  snoozeSnapshot: schema.maybe(schema.recordOf(schema.string(), schema.any())),
  snoozedAt: isoDateSchema,
  snoozedBy: schema.string({ maxLength: MAX_SNOOZED_BY_LENGTH }),
});

export const rawRuleSchema = rawRuleSchemaV11.extends({
  snoozedInstances: schema.maybe(
    schema.arrayOf(rawRuleSnoozedInstanceSchema, { maxSize: ALLOWED_MAX_ALERTS })
  ),
});
