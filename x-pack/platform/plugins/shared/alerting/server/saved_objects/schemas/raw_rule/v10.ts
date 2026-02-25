/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import {
  MAX_SNOOZED_INSTANCES,
  MAX_SNOOZE_CONDITIONS_PER_ENTRY,
} from '../../../../common/constants';
import { snoozeConditionOperator } from '../../../../common/routes/rule/common/constants/v1';
import { rawRuleSchema as rawRuleSchemaV9 } from './v9';

const snoozeConditionSchema = schema.object({
  type: schema.string(),
  field: schema.string(),
  value: schema.maybe(schema.string()),
  snapshotValue: schema.maybe(schema.string()),
});

const snoozedInstanceEntrySchema = schema.object({
  instanceId: schema.string(),
  expiresAt: schema.maybe(schema.string()),
  conditions: schema.maybe(
    schema.arrayOf(snoozeConditionSchema, { maxSize: MAX_SNOOZE_CONDITIONS_PER_ENTRY })
  ),
  conditionOperator: schema.maybe(
    schema.oneOf([
      schema.literal(snoozeConditionOperator.ANY),
      schema.literal(snoozeConditionOperator.ALL),
    ])
  ),
});

export const rawRuleSchema = rawRuleSchemaV9.extends({
  snoozedInstances: schema.maybe(
    schema.arrayOf(snoozedInstanceEntrySchema, { maxSize: MAX_SNOOZED_INSTANCES })
  ),
});
