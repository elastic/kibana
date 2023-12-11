/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { type TypeOf } from '@kbn/config-schema';
import * as v1 from './v1';

export const stateSchemaByVersion = {
  1: v1.versionDefinition,
};

const latest = v1;
/**
 * WARNING: Do not modify the code below when doing a new version.
 * Update the "latest" variable instead.
 */
const latestTaskStateSchema = latest.versionDefinition.schema;
export type LatestTaskStateSchema = TypeOf<typeof latestTaskStateSchema>;
export type LatestRawAlertInstanceSchema = TypeOf<typeof latest.rawAlertInstanceSchema>;
export type LatestAlertInstanceMetaSchema = TypeOf<typeof latest.metaSchema>;
export type LatestAlertInstanceStateSchema = TypeOf<typeof latest.alertStateSchema>;
export type LatestThrottledActionSchema = TypeOf<typeof latest.throttledActionSchema>;
export type LatestLastScheduledActionsSchema = TypeOf<typeof latest.lastScheduledActionsSchema>;

export const emptyState: LatestTaskStateSchema = {
  alertTypeState: {},
  alertInstances: {},
  alertRecoveredInstances: {},
  previousStartedAt: null,
  summaryActions: {},
};

type Mutable<T> = {
  -readonly [k in keyof T]: Mutable<T[k]>;
};
export type MutableLatestTaskStateSchema = Mutable<LatestTaskStateSchema>;
export type MutableLatestAlertInstanceMetaSchema = Mutable<LatestAlertInstanceMetaSchema>;
