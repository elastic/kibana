/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { executionStatusWarningReason, outcome } from './v3';
import { rawRuleSchema as rawRuleSchemaV16 } from './v16';

/**
 * Error reasons are stored as plain strings so a newer Kibana can write a reason an older
 * Kibana does not know yet without breaking forward compatibility during rollouts and
 * rollbacks. Unknown values are normalized to a known reason when the rule is read.
 */
const reasonSchema = schema.string({ maxLength: 100 });

export const rawRuleExecutionStatusSchema = schema.object({
  status: schema.oneOf([
    schema.literal('ok'),
    schema.literal('active'),
    schema.literal('error'),
    schema.literal('pending'),
    schema.literal('unknown'),
    schema.literal('warning'),
  ]),
  // Mapped on the rule saved object since before model versions; declared here so the
  // create schema matches the mapping.
  numberOfTriggeredActions: schema.maybe(schema.number()), // change
  lastExecutionDate: schema.string(),
  lastDuration: schema.maybe(schema.number()),
  error: schema.nullable(
    schema.object({
      reason: reasonSchema, // change
      message: schema.string(),
    })
  ),
  warning: schema.nullable(
    schema.object({
      reason: executionStatusWarningReason,
      message: schema.string(),
    })
  ),
});

export const rawRuleLastRunSchema = schema.object({
  outcome,
  outcomeOrder: schema.maybe(schema.number()),
  alertsCount: schema.object({
    new: schema.maybe(schema.nullable(schema.number())),
    active: schema.maybe(schema.nullable(schema.number())),
    recovered: schema.maybe(schema.nullable(schema.number())),
    ignored: schema.maybe(schema.nullable(schema.number())),
  }),
  outcomeMsg: schema.maybe(schema.nullable(schema.arrayOf(schema.string()))),
  warning: schema.maybe(schema.nullable(reasonSchema)), // change
});

export const rawRuleSchema = rawRuleSchemaV16.extends({
  executionStatus: rawRuleExecutionStatusSchema,
  lastRun: schema.maybe(schema.nullable(rawRuleLastRunSchema)),
});
