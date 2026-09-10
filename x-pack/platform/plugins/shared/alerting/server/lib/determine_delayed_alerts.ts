/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys } from 'lodash';
import { ALERT_STATUS_DELAYED } from '@kbn/rule-data-utils';
import type { Alert } from '../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../types';
import type { RuleRunMetricsStore } from './rule_run_metrics_store';

interface DetermineDelayedAlertsOpts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
> {
  newAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  activeAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  trackedActiveAlerts: Record<string, Alert<State, Context, ActionGroupIds>>;
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  trackedRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>>;
  delayedAlerts: Record<string, Alert<State, Context, ActionGroupIds | RecoveryActionGroupId>>;
  alertDelay: number;
  startedAt?: string | null;
  ruleRunMetricsStore: RuleRunMetricsStore;
}

export function determineDelayedAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  newAlerts,
  activeAlerts,
  trackedActiveAlerts,
  recoveredAlerts,
  trackedRecoveredAlerts,
  delayedAlerts,
  alertDelay,
  startedAt,
  ruleRunMetricsStore,
}: DetermineDelayedAlertsOpts<State, Context, ActionGroupIds, RecoveryActionGroupId>) {
  let delayedAlertsCount = 0;

  for (const id of keys(activeAlerts)) {
    const alert = activeAlerts[id];
    alert.incrementActiveCount();
    // do not trigger an action notification if the number of consecutive
    // active alerts is less than the rule alertDelay threshold
    if (alert.getActiveCount() < alertDelay) {
      alert.setStatus(ALERT_STATUS_DELAYED);
      delayedAlerts[id] = alert;
      delayedAlertsCount += 1;
      // remove from new alerts and active alerts
      delete newAlerts[id];
      delete activeAlerts[id];
    } else {
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

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    // if alert has not reached the alertDelay threshold don't recover the alert
    const activeCount = alert.getActiveCount();
    if (activeCount > 0 && activeCount < alertDelay) {
      // remove from recovered alerts
      alert.setStatus(ALERT_STATUS_DELAYED);
      delayedAlerts[id] = alert;
      delete recoveredAlerts[id];
      delete trackedRecoveredAlerts[id];
    }
    alert.resetActiveCount();
  }

  ruleRunMetricsStore.setNumberOfDelayedAlerts(delayedAlertsCount);

  return {
    newAlerts,
    activeAlerts,
    trackedActiveAlerts,
    recoveredAlerts,
    trackedRecoveredAlerts,
    delayedAlerts,
  };
}
