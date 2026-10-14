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
  MAX_SNOOZED_CONDITION_FIELD_LENGTH,
} from '../../../../common/max_alert_limit';
import { rawRuleSchema as rawRuleSchemaV13 } from './v13';
import { rawRuleSnoozedInstanceSchema as rawRuleSnoozedInstanceSchemaV12 } from './v12';

// The `severity_equals` value now accepts warning/minor/major on
// top of critical/high/medium/low/info.
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
      schema.literal('major'),
      schema.literal('high'),
      schema.literal('medium'),
      schema.literal('minor'),
      schema.literal('low'),
      schema.literal('warning'),
      schema.literal('info'),
    ]),
  }),
]);

export const rawRuleSnoozedInstanceSchema = rawRuleSnoozedInstanceSchemaV12.extends({
  conditions: schema.maybe(
    schema.arrayOf(rawRuleSnoozeConditionSchema, { maxSize: MAX_SNOOZED_INSTANCE_CONDITIONS })
  ),
});

export const rawRuleSchema = rawRuleSchemaV13.extends({
  snoozedInstances: schema.maybe(
    schema.arrayOf(rawRuleSnoozedInstanceSchema, { maxSize: ALLOWED_MAX_ALERTS })
  ),
});
