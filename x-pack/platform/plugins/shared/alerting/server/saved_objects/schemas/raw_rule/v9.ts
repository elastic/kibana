/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { rawRuleSchema as rawRuleSchemaV8 } from './v8';

const muteConditionSchema = schema.object({
  type: schema.oneOf([
    schema.literal('severity_change'),
    schema.literal('severity_equals'),
    schema.literal('field_change'),
  ]),
  field: schema.string(),
  value: schema.maybe(schema.string()),
  snapshotValue: schema.maybe(schema.string()),
});

const mutedAlertInstanceSchema = schema.object({
  alertInstanceId: schema.string(),
  mutedAt: schema.string(),
  mutedBy: schema.maybe(schema.string()),
  expiresAt: schema.maybe(schema.string()),
  conditions: schema.maybe(schema.arrayOf(muteConditionSchema)),
  conditionOperator: schema.maybe(
    schema.oneOf([schema.literal('any'), schema.literal('all')])
  ),
});

export const rawRuleSchema = rawRuleSchemaV8.extends({
  mutedAlerts: schema.maybe(schema.arrayOf(mutedAlertInstanceSchema)),
});
