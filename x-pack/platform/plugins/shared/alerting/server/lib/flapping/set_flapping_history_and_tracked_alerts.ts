/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys } from 'lodash';
import type { Alert } from '../../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../../types';
import { updateFlappingHistory } from './flapping_utils';
import type { RulesSettingsFlappingProperties } from '../../../common/rules_settings';

export function setFlappingHistoryAndTrackedAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupIds extends string
>(
  flappingSettings: RulesSettingsFlappingProperties,
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {},
  previouslyRecoveredAlerts: Record<string, Alert<State, Context>> = {}
): {
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  trackedActiveAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>>;
  trackedRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>>;
} {
  const trackedActiveAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {};
  const trackedRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupIds>> = {};
  const previouslyRecoveredAlertIds = new Set(Object.keys(previouslyRecoveredAlerts));

  for (const id of keys(activeAlerts)) {
    const alert = activeAlerts[id];
    trackedActiveAlerts[id] = alert;
    // this alert was not active in the previous run
    if (newAlerts[id]) {
      if (previouslyRecoveredAlertIds.has(id)) {
        // this alert has flapped from recovered to active
        const previousFlappingHistory = previouslyRecoveredAlerts[id].getFlappingHistory();
        alert.setFlappingHistory(previousFlappingHistory);
        previouslyRecoveredAlertIds.delete(id);
      }
      updateAlertFlappingHistory(flappingSettings, newAlerts[id], true);
    } else {
      // this alert is still active
      updateAlertFlappingHistory(flappingSettings, alert, false);
    }
  }

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    trackedRecoveredAlerts[id] = alert;
    // this alert has flapped from active to recovered
    updateAlertFlappingHistory(flappingSettings, alert, true);
  }

  for (const id of previouslyRecoveredAlertIds) {
    const alert = previouslyRecoveredAlerts[id];
    trackedRecoveredAlerts[id] = alert;
    // this alert is still recovered
    updateAlertFlappingHistory(flappingSettings, alert, false);
  }

  return { newAlerts, activeAlerts, trackedActiveAlerts, recoveredAlerts, trackedRecoveredAlerts };
}

export function updateAlertFlappingHistory<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  flappingSettings: RulesSettingsFlappingProperties,
  alert: Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>,
  state: boolean
) {
  const updatedFlappingHistory = updateFlappingHistory(
    flappingSettings,
    alert.getFlappingHistory() || [],
    state
  );
  alert.setFlappingHistory(updatedFlappingHistory);
}
