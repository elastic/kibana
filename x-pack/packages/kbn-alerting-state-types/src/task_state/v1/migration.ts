/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf } from '@kbn/config-schema';
import { isJSONObject, isString, isBoolean, isNumber, isStringArray, isBooleanArray } from '../lib';
import {
  versionSchema,
  throttledActionSchema,
  rawAlertInstanceSchema,
  metaSchema,
  lastScheduledActionsSchema,
} from './schema';

type VersionSchema = TypeOf<typeof versionSchema>;
type ThrottledActionsSchema = TypeOf<typeof throttledActionSchema>;
type LastScheduledActionsSchema = TypeOf<typeof lastScheduledActionsSchema>;
type RawAlertInstanceSchema = TypeOf<typeof rawAlertInstanceSchema>;

export function migrateThrottledActions(
  throttledActions: unknown
): ThrottledActionsSchema | undefined {
  if (!isJSONObject(throttledActions)) {
    return;
  }
  return Object.keys(throttledActions).reduce((acc, key) => {
    const val = throttledActions[key];
    if (isJSONObject(val) && isString(val.date)) {
      acc[key] = {
        date: val.date,
      };
    }
    return acc;
  }, {} as TypeOf<typeof throttledActionSchema>);
}

export function migrateLastScheduledActions(
  lastScheduledActions: unknown
): LastScheduledActionsSchema | undefined {
  if (
    !isJSONObject(lastScheduledActions) ||
    !isString(lastScheduledActions.group) ||
    !isString(lastScheduledActions.date)
  ) {
    return;
  }
  return {
    subgroup: isString(lastScheduledActions.subgroup) ? lastScheduledActions.subgroup : undefined,
    group: lastScheduledActions.group,
    date: lastScheduledActions.date,
    actions: migrateThrottledActions(lastScheduledActions.actions),
  };
}

export function migrateMeta(meta: unknown): TypeOf<typeof metaSchema> | undefined {
  if (!isJSONObject(meta)) {
    return;
  }
  return {
    lastScheduledActions: migrateLastScheduledActions(meta.lastScheduledActions),
    flappingHistory: isBooleanArray(meta.flappingHistory) ? meta.flappingHistory : undefined,
    flapping: isBoolean(meta.flapping) ? meta.flapping : undefined,
    maintenanceWindowIds: isStringArray(meta.maintenanceWindowIds)
      ? meta.maintenanceWindowIds
      : undefined,
    pendingRecoveredCount: isNumber(meta.pendingRecoveredCount)
      ? meta.pendingRecoveredCount
      : undefined,
    uuid: isString(meta.uuid) ? meta.uuid : undefined,
  };
}

export function migrateAlertInstances(
  alertInstances: unknown
): Record<string, RawAlertInstanceSchema> | undefined {
  if (!isJSONObject(alertInstances)) {
    return;
  }
  return Object.keys(alertInstances).reduce((acc, key) => {
    const val = alertInstances[key];
    if (isJSONObject(val)) {
      acc[key] = {
        meta: migrateMeta(val.meta),
        state: isJSONObject(val.state) ? val.state : undefined,
      };
    }
    return acc;
  }, {} as Record<string, RawAlertInstanceSchema>);
}

export const upMigration = (state: Record<string, unknown>): VersionSchema => {
  return {
    alertTypeState: isJSONObject(state.alertTypeState) ? state.alertTypeState : undefined,
    alertInstances: migrateAlertInstances(state.alertInstances),
    alertRecoveredInstances: migrateAlertInstances(state.alertRecoveredInstances),
    previousStartedAt: isString(state.previousStartedAt) ? state.previousStartedAt : undefined,
    summaryActions: migrateThrottledActions(state.summaryActions),
  };
};
