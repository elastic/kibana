/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys } from 'lodash';
import type { Logger } from '@kbn/logging';
import type { Alert } from '../alert';
import type { AlertInstanceState, AlertInstanceContext, RawAlertInstance } from '../types';
import { optimizeTaskStateForFlapping } from './flapping/optimize_task_state_for_flapping';

export function toRawAlertInstances<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  logger: Logger,
  maxAlerts: number,
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>> = {},
  shouldOptimizeTaskState: boolean = false
): {
  rawActiveAlerts: Record<string, RawAlertInstance>;
  rawRecoveredAlerts: Record<string, RawAlertInstance>;
} {
  const rawActiveAlerts: Record<string, RawAlertInstance> = {};
  const rawRecoveredAlerts: Record<string, RawAlertInstance> = {};

  for (const id of keys(activeAlerts)) {
    rawActiveAlerts[id] = activeAlerts[id].toRaw();
  }

  if (shouldOptimizeTaskState) {
    recoveredAlerts = optimizeTaskStateForFlapping(logger, recoveredAlerts, maxAlerts);
  }
  for (const id of keys(recoveredAlerts)) {
    rawRecoveredAlerts[id] = recoveredAlerts[id].toRaw(true);
  }

  return { rawActiveAlerts, rawRecoveredAlerts };
}
