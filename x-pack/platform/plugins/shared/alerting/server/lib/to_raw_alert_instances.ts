/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
  activeAlerts: Map<string, Alert<State, Context, ActionGroupIds>> = new Map(),
  recoveredAlerts: Map<string, Alert<State, Context, ActionGroupIds>> = new Map(),
  shouldOptimizeTaskState: boolean = false
): {
  rawActiveAlerts: Map<string, RawAlertInstance>;
  rawRecoveredAlerts: Map<string, RawAlertInstance>;
} {
  const rawActiveAlerts: Map<string, RawAlertInstance> = new Map();
  const rawRecoveredAlerts: Map<string, RawAlertInstance> = new Map();

  activeAlerts.forEach((alert, id) => {
    rawActiveAlerts.set(id, alert.toRaw());
  });

  if (shouldOptimizeTaskState) {
    optimizeTaskStateForFlapping(logger, recoveredAlerts, maxAlerts);
  }

  recoveredAlerts.forEach((alert, id) => {
    rawRecoveredAlerts.set(id, alert.toRaw(true));
  });

  return { rawActiveAlerts, rawRecoveredAlerts };
}
