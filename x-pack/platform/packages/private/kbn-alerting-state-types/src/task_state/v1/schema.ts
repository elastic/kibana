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
// https://github.com/elastic/kibana/issues/159344
export const alertStateSchema = schema.recordOf(schema.string(), schema.maybe(schema.any()));
// TODO: Add schema by rule type for rule state
// https://github.com/elastic/kibana/issues/159344
const ruleStateSchema = schema.recordOf(schema.string(), schema.maybe(schema.any()));

export const lastScheduledActionsSchema = schema.object({
  subgroup: schema.maybe(schema.string()),
  group: schema.string(),
  date: schema.string(),
  actions: schema.maybe(throttledActionSchema),
});

export const metaSchema = schema.object({
  lastScheduledActions: schema.maybe(lastScheduledActionsSchema),
  // an array used to track changes in alert state, the order is based on the rule executions (oldest to most recent)
  // true - alert has changed from active/recovered
  // false - the status has remained either active or recovered
  flappingHistory: schema.maybe(schema.arrayOf(schema.boolean())),
  // flapping flag that indicates whether the alert is flapping
  flapping: schema.maybe(schema.boolean()),
  maintenanceWindowIds: schema.maybe(schema.arrayOf(schema.string())),
  // count of consecutive recovered alerts for flapping
  // will reset if the alert is active or if equal to the statusChangeThreshold stored in the rule settings
  pendingRecoveredCount: schema.maybe(schema.number()),
  uuid: schema.maybe(schema.string()),
  // count of consecutive active alerts will reset if the alert is recovered
  activeCount: schema.maybe(schema.number()),
});

export const rawAlertInstanceSchema = schema.object({
  meta: schema.maybe(metaSchema),
  state: schema.maybe(alertStateSchema),
});

export const versionSchema = schema.object({
  alertTypeState: schema.maybe(ruleStateSchema),
  // tracks the active alerts
  alertInstances: schema.maybe(schema.recordOf(schema.string(), rawAlertInstanceSchema)),
  // tracks the recovered alerts for flapping purposes
  alertRecoveredInstances: schema.maybe(schema.recordOf(schema.string(), rawAlertInstanceSchema)),
  previousStartedAt: schema.maybe(schema.nullable(schema.string())),
  summaryActions: schema.maybe(throttledActionSchema),
});
