/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const actionSchema = schema.object({ date: schema.string() });
export const throttledActionSchema = schema.recordOf(schema.string(), actionSchema);
// TODO: Add schema by rule type for alert state
export const alertStateSchema = schema.recordOf(schema.string(), schema.maybe(schema.any()));
// TODO: Add schema by rule type for rule state
const ruleStateSchema = schema.recordOf(schema.string(), schema.maybe(schema.any()));

export const lastScheduledActionsSchema = schema.object({
  subgroup: schema.maybe(schema.string()),
  group: schema.string(),
  date: schema.string(),
  actions: schema.maybe(throttledActionSchema),
});

export const metaSchema = schema.object({
  lastScheduledActions: schema.maybe(lastScheduledActionsSchema),
  flappingHistory: schema.maybe(schema.arrayOf(schema.boolean())),
  flapping: schema.maybe(schema.boolean()),
  maintenanceWindowIds: schema.maybe(schema.arrayOf(schema.string())),
  pendingRecoveredCount: schema.maybe(schema.number()),
  uuid: schema.maybe(schema.string()),
});

export const rawAlertInstanceSchema = schema.object({
  meta: schema.maybe(metaSchema),
  state: schema.maybe(alertStateSchema),
});

export const versionSchema = schema.object({
  alertTypeState: schema.maybe(ruleStateSchema),
  alertInstances: schema.maybe(schema.recordOf(schema.string(), rawAlertInstanceSchema)),
  alertRecoveredInstances: schema.maybe(schema.recordOf(schema.string(), rawAlertInstanceSchema)),
  previousStartedAt: schema.maybe(schema.nullable(schema.string())),
  summaryActions: schema.maybe(throttledActionSchema),
});
