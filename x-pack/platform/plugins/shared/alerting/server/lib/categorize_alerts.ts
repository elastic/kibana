/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { Alert } from '../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../types';
import { AlertCategory, type AlertsResult } from '../alerts_client/types';

interface CategorizeAlertsOpts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext
> {
  alerts: Map<string, Alert<State, Context>>;
  existingAlerts: Map<string, Alert<State, Context>>;
  previouslyRecoveredAlerts?: Map<string, Alert<State, Context>>;
  autoRecoverAlerts: boolean;
  startedAt: string;
}

export function categorizeAlerts<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  ActionGroupIds extends string,
  RecoveryActionGroupId extends string
>({
  alerts,
  existingAlerts,
  previouslyRecoveredAlerts,
  autoRecoverAlerts,
  startedAt,
}: CategorizeAlertsOpts<State, Context>): AlertsResult<
  State,
  Context,
  ActionGroupIds,
  RecoveryActionGroupId
> {
  const reportedAlerts = cloneDeep(alerts);
  const categorizedAlerts: AlertsResult<State, Context, ActionGroupIds, RecoveryActionGroupId> = [];
  const existingAlertIds = new Set([...existingAlerts.keys()]);

  // Add all existing alerts
  existingAlerts.forEach((alert) => {
    categorizedAlerts.push({ alert, category: AlertCategory.Existing });
  });

  // Add all previously recovered alerts
  (previouslyRecoveredAlerts ?? []).forEach((alert) => {
    categorizedAlerts.push({ alert, category: AlertCategory.PreviouslyRecovered });
  });

  // Categorize reported alerts into new, ongoing and recovered
  reportedAlerts.forEach((alert, id) => {
    // alerts with scheduled actions are considered "active"
    if (alert.hasScheduledActions()) {
      // if this alert was not active in the previous run, this is a new alert
      // we need to inject start time into the alert state
      const existingAlert = existingAlerts.get(id);
      if (!existingAlert) {
        categorizedAlerts.push({ alert: alert.setStart(startedAt), category: AlertCategory.New });
      } else {
        // this alert did exist in previous run, this is an ongoing alert
        // calculate duration to date for active alerts
        categorizedAlerts.push({
          alert: alert.updateDuration(startedAt, existingAlert.getStart()),
          category: AlertCategory.Ongoing,
        });
      }
    } else if (existingAlertIds.has(id) && autoRecoverAlerts) {
      // Inject end time into alert state of recovered alerts
      categorizedAlerts.push({
        alert: alert.setEnd(startedAt),
        category: AlertCategory.Recovered,
      });
    }
  });

  return categorizedAlerts;
}
