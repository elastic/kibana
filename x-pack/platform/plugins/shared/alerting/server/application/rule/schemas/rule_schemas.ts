/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { ruleParamsSchema } from '@kbn/response-ops-rule-params';
import {
  ruleLastRunOutcomeValues,
  ruleExecutionStatusValues,
  ruleExecutionStatusErrorReason,
  ruleExecutionStatusWarningReason,
} from '../constants';
import { rRuleSchema } from '../../r_rule/schemas';
import { dateSchema } from './date_schema';
import { notifyWhenSchema } from './notify_when_schema';
import { actionSchema, systemActionSchema } from './action_schemas';
import { flappingSchema } from './flapping_schema';

export const mappedParamsSchema = schema.recordOf(schema.string(), schema.maybe(schema.any()));

export const intervalScheduleSchema = schema.object({
  interval: schema.string(),
});

export const ruleExecutionStatusSchema = schema.object({
  status: schema.oneOf([
    schema.literal(ruleExecutionStatusValues.OK),
    schema.literal(ruleExecutionStatusValues.ACTIVE),
    schema.literal(ruleExecutionStatusValues.ERROR),
    schema.literal(ruleExecutionStatusValues.WARNING),
    schema.literal(ruleExecutionStatusValues.PENDING),
    schema.literal(ruleExecutionStatusValues.UNKNOWN),
  ]),
  lastExecutionDate: dateSchema,
  lastDuration: schema.maybe(schema.number()),
  error: schema.maybe(
    schema.object({
      reason: schema.oneOf([
        schema.literal(ruleExecutionStatusErrorReason.READ),
        schema.literal(ruleExecutionStatusErrorReason.DECRYPT),
        schema.literal(ruleExecutionStatusErrorReason.EXECUTE),
        schema.literal(ruleExecutionStatusErrorReason.UNKNOWN),
        schema.literal(ruleExecutionStatusErrorReason.LICENSE),
        schema.literal(ruleExecutionStatusErrorReason.TIMEOUT),
        schema.literal(ruleExecutionStatusErrorReason.DISABLED),
        schema.literal(ruleExecutionStatusErrorReason.VALIDATE),
      ]),
      message: schema.string(),
    })
  ),
  warning: schema.maybe(
    schema.object({
      reason: schema.oneOf([
        schema.literal(ruleExecutionStatusWarningReason.MAX_EXECUTABLE_ACTIONS),
        schema.literal(ruleExecutionStatusWarningReason.MAX_ALERTS),
        schema.literal(ruleExecutionStatusWarningReason.MAX_QUEUED_ACTIONS),
        schema.literal(ruleExecutionStatusWarningReason.EXECUTION),
      ]),
      message: schema.string(),
    })
  ),
});

const outcome = schema.oneOf([
  schema.literal(ruleLastRunOutcomeValues.SUCCEEDED),
  schema.literal(ruleLastRunOutcomeValues.WARNING),
  schema.literal(ruleLastRunOutcomeValues.FAILED),
]);

export const ruleLastRunSchema = schema.object({
  outcome,
  outcomeOrder: schema.maybe(schema.number()),
  warning: schema.maybe(
    schema.nullable(
      schema.oneOf([
        schema.literal(ruleExecutionStatusErrorReason.READ),
        schema.literal(ruleExecutionStatusErrorReason.DECRYPT),
        schema.literal(ruleExecutionStatusErrorReason.EXECUTE),
        schema.literal(ruleExecutionStatusErrorReason.UNKNOWN),
        schema.literal(ruleExecutionStatusErrorReason.LICENSE),
        schema.literal(ruleExecutionStatusErrorReason.TIMEOUT),
        schema.literal(ruleExecutionStatusErrorReason.DISABLED),
        schema.literal(ruleExecutionStatusErrorReason.VALIDATE),
        schema.literal(ruleExecutionStatusWarningReason.MAX_EXECUTABLE_ACTIONS),
        schema.literal(ruleExecutionStatusWarningReason.MAX_ALERTS),
        schema.literal(ruleExecutionStatusWarningReason.MAX_QUEUED_ACTIONS),
        schema.literal(ruleExecutionStatusWarningReason.EXECUTION),
      ])
    )
  ),
  outcomeMsg: schema.maybe(schema.nullable(schema.arrayOf(schema.string()))),
  alertsCount: schema.object({
    active: schema.maybe(schema.nullable(schema.number())),
    new: schema.maybe(schema.nullable(schema.number())),
    recovered: schema.maybe(schema.nullable(schema.number())),
    ignored: schema.maybe(schema.nullable(schema.number())),
  }),
});

export const monitoringSchema = schema.object({
  run: schema.object({
    history: schema.arrayOf(
      schema.object({
        success: schema.boolean(),
        timestamp: schema.number(),
        duration: schema.maybe(schema.number()),
        outcome: schema.maybe(outcome),
      })
    ),
    calculated_metrics: schema.object({
      p50: schema.maybe(schema.number()),
      p95: schema.maybe(schema.number()),
      p99: schema.maybe(schema.number()),
      success_ratio: schema.number(),
    }),
    last_run: schema.object({
      timestamp: schema.string(),
      metrics: schema.object({
        duration: schema.maybe(schema.number()),
        total_search_duration_ms: schema.maybe(schema.nullable(schema.number())),
        total_indexing_duration_ms: schema.maybe(schema.nullable(schema.number())),
        total_alerts_detected: schema.maybe(schema.nullable(schema.number())),
        total_alerts_created: schema.maybe(schema.nullable(schema.number())),
        gap_duration_s: schema.maybe(schema.nullable(schema.number())),
        gap_range: schema.maybe(
          schema.nullable(
            schema.object({
              gte: schema.string(),
              lte: schema.string(),
            })
          )
        ),
      }),
    }),
  }),
});

export const snoozeScheduleSchema = schema.object({
  duration: schema.number(),
  rRule: rRuleSchema,
  id: schema.maybe(schema.string()),
  skipRecurrences: schema.maybe(schema.arrayOf(schema.string())),
});

export const alertDelaySchema = schema.object({
  active: schema.number(),
});

/**
 * Unsanitized (domain) rule schema, used by internal rules clients
 */
export const ruleDomainSchema = schema.object({
  id: schema.string(),
  enabled: schema.boolean(),
  name: schema.string(),
  tags: schema.arrayOf(schema.string()),
  alertTypeId: schema.string(),
  consumer: schema.string(),
  schedule: intervalScheduleSchema,
  actions: schema.arrayOf(actionSchema),
  systemActions: schema.maybe(schema.arrayOf(systemActionSchema)),
  params: ruleParamsSchema,
  mapped_params: schema.maybe(mappedParamsSchema),
  scheduledTaskId: schema.maybe(schema.string()),
  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  apiKey: schema.nullable(schema.string()),
  apiKeyOwner: schema.nullable(schema.string()),
  apiKeyCreatedByUser: schema.maybe(schema.nullable(schema.boolean())),
  throttle: schema.maybe(schema.nullable(schema.string())),
  muteAll: schema.boolean(),
  notifyWhen: schema.maybe(schema.nullable(notifyWhenSchema)),
  mutedInstanceIds: schema.arrayOf(schema.string()),
  executionStatus: ruleExecutionStatusSchema,
  monitoring: schema.maybe(monitoringSchema),
  snoozeSchedule: schema.maybe(schema.arrayOf(snoozeScheduleSchema)),
  activeSnoozes: schema.maybe(schema.arrayOf(schema.string())),
  isSnoozedUntil: schema.maybe(schema.nullable(dateSchema)),
  lastRun: schema.maybe(schema.nullable(ruleLastRunSchema)),
  nextRun: schema.maybe(schema.nullable(dateSchema)),
  revision: schema.number(),
  running: schema.maybe(schema.nullable(schema.boolean())),
  viewInAppRelativeUrl: schema.maybe(schema.nullable(schema.string())),
  alertDelay: schema.maybe(alertDelaySchema),
  legacyId: schema.maybe(schema.nullable(schema.string())),
  flapping: schema.maybe(schema.nullable(flappingSchema)),
});

/**
 * Sanitized (non-domain) rule schema, returned by rules clients for other solutions
 */
export const ruleSchema = schema.object({
  id: schema.string(),
  enabled: schema.boolean(),
  name: schema.string(),
  tags: schema.arrayOf(schema.string()),
  alertTypeId: schema.string(),
  consumer: schema.string(),
  schedule: intervalScheduleSchema,
  actions: schema.arrayOf(actionSchema),
  systemActions: schema.maybe(schema.arrayOf(systemActionSchema)),
  params: ruleParamsSchema,
  mapped_params: schema.maybe(mappedParamsSchema),
  scheduledTaskId: schema.maybe(schema.string()),
  createdBy: schema.nullable(schema.string()),
  updatedBy: schema.nullable(schema.string()),
  createdAt: dateSchema,
  updatedAt: dateSchema,
  apiKeyOwner: schema.nullable(schema.string()),
  apiKeyCreatedByUser: schema.maybe(schema.nullable(schema.boolean())),
  throttle: schema.maybe(schema.nullable(schema.string())),
  muteAll: schema.boolean(),
  notifyWhen: schema.maybe(schema.nullable(notifyWhenSchema)),
  mutedInstanceIds: schema.arrayOf(schema.string()),
  executionStatus: ruleExecutionStatusSchema,
  monitoring: schema.maybe(monitoringSchema),
  snoozeSchedule: schema.maybe(schema.arrayOf(snoozeScheduleSchema)),
  activeSnoozes: schema.maybe(schema.arrayOf(schema.string())),
  isSnoozedUntil: schema.maybe(schema.nullable(dateSchema)),
  lastRun: schema.maybe(schema.nullable(ruleLastRunSchema)),
  nextRun: schema.maybe(schema.nullable(dateSchema)),
  revision: schema.number(),
  running: schema.maybe(schema.nullable(schema.boolean())),
  viewInAppRelativeUrl: schema.maybe(schema.nullable(schema.string())),
  alertDelay: schema.maybe(alertDelaySchema),
  legacyId: schema.maybe(schema.nullable(schema.string())),
  flapping: schema.maybe(schema.nullable(flappingSchema)),
});
