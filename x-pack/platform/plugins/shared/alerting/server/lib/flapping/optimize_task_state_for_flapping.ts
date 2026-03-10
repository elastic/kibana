/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { keys, map } from 'lodash';
import type { Logger } from '@kbn/logging';
import type { Alert } from '../../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../../types';

export function optimizeTaskStateForFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  RecoveryActionGroupId extends string
>(
  logger: Logger,
  recoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>> = {},
  maxAlerts: number
): Record<string, Alert<State, Context, RecoveryActionGroupId>> {
  // this is a space saving effort that will remove the oldest recovered alerts
  // tracked in the task state if the number of alerts we plan to track is over the max alert limit
  const alertIdsOverMaxLimit = getAlertIdsOverMaxLimit(logger, recoveredAlerts, maxAlerts);
  for (const id of alertIdsOverMaxLimit) {
    delete recoveredAlerts[id];
  }

  for (const id of keys(recoveredAlerts)) {
    const alert = recoveredAlerts[id];
    // this is also a space saving effort that will only remove recovered alerts if they are not flapping
    // and if the flapping array does not contain any state changes
    const flapping = alert.getFlapping();
    const flappingHistory: boolean[] = alert.getFlappingHistory() || [];
    const numStateChanges = flappingHistory.filter((f) => f).length;
    if (!flapping && numStateChanges === 0) {
      delete recoveredAlerts[id];
    }
  }
  return recoveredAlerts;
}

export function getAlertIdsOverMaxLimit<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  RecoveryActionGroupId extends string
>(
  logger: Logger,
  trackedRecoveredAlerts: Record<string, Alert<State, Context, RecoveryActionGroupId>>,
  maxAlerts: number
) {
  const alerts = map(trackedRecoveredAlerts, (alert, id) => {
    return {
      id,
      flappingHistory: alert.getFlappingHistory() || [],
    };
  });

  let earlyRecoveredAlertIds: string[] = [];
  if (alerts.length > maxAlerts) {
    // alerts are sorted by age using the length of the flapping array
    alerts.sort((a, b) => {
      return a.flappingHistory.length - b.flappingHistory.length;
    });

    earlyRecoveredAlertIds = alerts.slice(maxAlerts).map((alert) => alert.id);
    logger.warn(
      `Recovered alerts have exceeded the max alert limit of ${maxAlerts} : dropping ${
        earlyRecoveredAlertIds.length
      } ${earlyRecoveredAlertIds.length > 1 ? 'alerts' : 'alert'}.`
    );
  }
  return earlyRecoveredAlertIds;
}
