/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { cloneDeep } from 'lodash';
import type { Alert } from '../alert';
import type { AlertInstanceState as State, AlertInstanceContext as Context } from '../types';
import { AlertCategory, type AlertsResult } from '../alerts_client/mappers/types';

interface CategorizeAlertsOpts<S extends State, C extends Context, G extends string> {
  alerts: Map<string, Alert<S, C, G>>;
  existingAlerts: Map<string, Alert<S, C, G>>;
  autoRecoverAlerts: boolean;
  startedAt: string;
}

export function categorizeAlerts<S extends State, C extends Context, G extends string>({
  alerts,
  existingAlerts,
  autoRecoverAlerts,
  startedAt,
}: CategorizeAlertsOpts<S, C, G>): AlertsResult<S, C, G> {
  const reportedAlerts = cloneDeep(alerts);
  const categorizedAlerts: AlertsResult<S, C, G> = [];
  const existingAlertIds = new Set([...existingAlerts.keys()]);

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
