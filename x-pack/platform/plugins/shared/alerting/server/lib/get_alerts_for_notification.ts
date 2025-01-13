/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys } from 'lodash';
import { RulesSettingsFlappingProperties } from '../../common/rules_settings';
import { Alert } from '../alert';
import { AlertInstanceState, AlertInstanceContext } from '../types';

export function getAlertsForNotification<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>(
  flappingSettings: RulesSettingsFlappingProperties,
  actionGroupId: string,
  alertDelay: number,
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {},
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>> = {},
  currentRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>> = {},
  startedAt?: string | null
) {
  const currentActiveAlerts: Record<string, Alert<State, Context, ActionGroupIds>> = {};
  let delayedAlertsCount = 0;

  for (const id of keys(activeAlerts)) {
    const alert = activeAlerts[id];
    alert.incrementActiveCount();
    alert.resetPendingRecoveredCount();
    // do not trigger an action notification if the number of consecutive
    // active alerts is less than the rule alertDelay threshold
    if (alert.getActiveCount() < alertDelay) {
      // remove from new alerts
      delete newAlerts[id];
      delayedAlertsCount += 1;
    } else {
      currentActiveAlerts[id] = alert;
      // if the active count is equal to the alertDelay it is considered a new alert
      if (alert.getActiveCount() === alertDelay) {
        const currentTime = startedAt ?? new Date().toISOString();
        const state = alert.getState();
        // keep the state and update the start time and duration
        alert.replaceState({ ...state, start: currentTime, duration: '0' });
        newAlerts[id] = alert;
      }
    }
  }

  for (const id of keys(currentRecoveredAlerts)) {
    const alert = recoveredAlerts[id];
    // if alert has not reached the alertDelay threshold don't recover the alert
    if (alert.getActiveCount() < alertDelay) {
      // remove from recovered alerts
      delete recoveredAlerts[id];
      delete currentRecoveredAlerts[id];
    }
    alert.resetActiveCount();
    if (flappingSettings.enabled) {
      const flapping = alert.getFlapping();
      if (flapping) {
        alert.incrementPendingRecoveredCount();

        if (alert.getPendingRecoveredCount() < flappingSettings.statusChangeThreshold) {
          // keep the context and previous actionGroupId if available
          const context = alert.getContext();
          const lastActionGroupId = alert.getLastScheduledActions()?.group;

          const newAlert = new Alert<State, Context, ActionGroupIds>(id, alert.toRaw());
          // unset the end time in the alert state
          const state = newAlert.getState();
          delete state.end;
          newAlert.replaceState(state);

          // schedule actions for the new active alert
          newAlert.scheduleActions(
            (lastActionGroupId ? lastActionGroupId : actionGroupId) as ActionGroupIds,
            context
          );
          activeAlerts[id] = newAlert;
          currentActiveAlerts[id] = newAlert;

          // remove from recovered alerts
          delete recoveredAlerts[id];
          delete currentRecoveredAlerts[id];
        } else {
          alert.resetPendingRecoveredCount();
        }
      }
    } else {
      alert.resetPendingRecoveredCount();
    }
  }

  return {
    newAlerts,
    activeAlerts,
    currentActiveAlerts,
    recoveredAlerts,
    currentRecoveredAlerts,
    delayedAlertsCount,
  };
}
