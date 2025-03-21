/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys } from 'lodash';
import type { Alert } from '../alert';
import type { AlertInstanceState, AlertInstanceContext, RawAlertInstance } from '../types';

export function toRawAlertInstances<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
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

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    if (shouldOptimizeTaskState) {
      // this is a space saving effort that will only return recovered alerts if they are flapping
      // or if the flapping array contains any state changes
      const flapping = alert.getFlapping();
      const flappingHistory: boolean[] = alert.getFlappingHistory() || [];
      const numStateChanges = flappingHistory.filter((f) => f).length;
      if (flapping) {
        rawRecoveredAlerts[id] = alert.toRaw(true);
      } else if (numStateChanges > 0) {
        rawRecoveredAlerts[id] = alert.toRaw(true);
      }
    } else {
      rawRecoveredAlerts[id] = alert.toRaw(true);
    }
  }
  return { rawActiveAlerts, rawRecoveredAlerts };
}
