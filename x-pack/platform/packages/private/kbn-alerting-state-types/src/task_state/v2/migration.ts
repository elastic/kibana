/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf } from '@kbn/config-schema';
import { isJSONObject, isString } from '../lib';
import { versionSchema } from './schema';

import {
  migrateAlertInstances as migrateAlertInstancesV1,
  migrateThrottledActions as migrateThrottledActionsV1,
} from '../v1/migration';

type VersionSchema = TypeOf<typeof versionSchema>;

export const upMigration = (state: Record<string, unknown>): VersionSchema => {
  return {
    alertTypeState: isJSONObject(state.alertTypeState) ? state.alertTypeState : undefined,
    alertInstances: migrateAlertInstancesV1(state.alertInstances),
    alertRecoveredInstances: migrateAlertInstancesV1(state.alertRecoveredInstances),
    previousStartedAt: isString(state.previousStartedAt) ? state.previousStartedAt : undefined,
    summaryActions: migrateThrottledActionsV1(state.summaryActions),
    executionUuid: isString(state.executionUuid) ? state.executionUuid : undefined,
  };
};
