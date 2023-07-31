/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { every } from 'lodash';
import { type TypeOf } from '@kbn/config-schema';
import { isJSONObject } from '../lib';
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
    if (isJSONObject(val) && typeof val.date === 'string') {
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
    typeof lastScheduledActions.group !== 'string' ||
    typeof lastScheduledActions.date !== 'string'
  ) {
    return;
  }
  return {
    subgroup:
      typeof lastScheduledActions.subgroup === 'string' ? lastScheduledActions.subgroup : undefined,
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
    flappingHistory:
      Array.isArray(meta.flappingHistory) &&
      every(meta.flappingHistory, (item) => typeof item === 'boolean')
        ? meta.flappingHistory
        : undefined,
    flapping: typeof meta.flapping === 'boolean' ? meta.flapping : undefined,
    maintenanceWindowIds:
      Array.isArray(meta.maintenanceWindowIds) &&
      every(meta.maintenanceWindowIds, (item) => typeof item === 'string')
        ? meta.maintenanceWindowIds
        : undefined,
    pendingRecoveredCount:
      typeof meta.pendingRecoveredCount === 'number' ? meta.pendingRecoveredCount : undefined,
    uuid: typeof meta.uuid === 'string' ? meta.uuid : undefined,
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
    previousStartedAt:
      typeof state.previousStartedAt === 'string' ? state.previousStartedAt : undefined,
    summaryActions: migrateThrottledActions(state.summaryActions),
  };
};
