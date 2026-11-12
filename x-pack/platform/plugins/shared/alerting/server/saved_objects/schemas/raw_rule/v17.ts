/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { RuleExecutionStatusErrorReasons } from '@kbn/alerting-types';
import {
  executionStatusErrorReason as executionStatusErrorReasonV3,
  executionStatusWarningReason,
  rawRuleExecutionStatusSchema as rawRuleExecutionStatusSchemaV3,
  rawRuleLastRunSchema as rawRuleLastRunSchemaV3,
} from './v3';
import { rawRuleSchema as rawRuleSchemaV16 } from './v16';

export const executionStatusErrorReason = schema.oneOf([
  executionStatusErrorReasonV3,
  schema.literal(RuleExecutionStatusErrorReasons.Unauthorized),
  schema.literal(RuleExecutionStatusErrorReasons.Forbidden),
  schema.literal(RuleExecutionStatusErrorReasons.NotFound),
  schema.literal(RuleExecutionStatusErrorReasons.Unavailable),
]);

export const rawRuleExecutionStatusSchema = rawRuleExecutionStatusSchemaV3.extends({
  error: schema.nullable(
    schema.object({
      reason: executionStatusErrorReason,
      message: schema.string(),
    })
  ),
});

export const rawRuleLastRunSchema = rawRuleLastRunSchemaV3.extends({
  warning: schema.maybe(
    schema.nullable(schema.oneOf([executionStatusErrorReason, executionStatusWarningReason]))
  ),
});

export const rawRuleSchema = rawRuleSchemaV16.extends({
  executionStatus: rawRuleExecutionStatusSchema,
  lastRun: schema.maybe(schema.nullable(rawRuleLastRunSchema)),
});
