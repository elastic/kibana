/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/logging';
import type { Alert } from '../../alert';
import type { AlertInstanceState, AlertInstanceContext } from '../../types';

export function optimizeTaskStateForFlapping<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  RecoveryActionGroupId extends string
>(
  logger: Logger,
  recoveredAlerts: Map<string, Alert<State, Context, RecoveryActionGroupId>> = new Map(),
  maxAlerts: number
) {
  // this is a space saving effort that will remove the oldest recovered alerts
  // tracked in the task state if the number of alerts we plan to track is over the max alert limit
  const alertIdsOverMaxLimit = getAlertIdsOverMaxLimit(logger, recoveredAlerts, maxAlerts);
  for (const id of alertIdsOverMaxLimit) {
    recoveredAlerts.delete(id);
  }

  recoveredAlerts.forEach((alert, id) => {
    // this is also a space saving effort that will only remove recovered alerts if they are not flapping
    // and if the flapping array does not contain any state changes
    const flapping = alert.getFlapping();
    const flappingHistory: boolean[] = alert.getFlappingHistory() || [];
    const numStateChanges = flappingHistory.filter((f) => f).length;
    if (!flapping && numStateChanges === 0) {
      recoveredAlerts.delete(id);
    }
  });
}

export function getAlertIdsOverMaxLimit<
  State extends AlertInstanceState,
  Context extends AlertInstanceContext,
  RecoveryActionGroupId extends string
>(
  logger: Logger,
  trackedRecoveredAlerts: Map<string, Alert<State, Context, RecoveryActionGroupId>>,
  maxAlerts: number
) {
  const alertFlappingData: Array<{ id: string; flappingHistory: boolean[] }> = [];
  trackedRecoveredAlerts.forEach((alert, id) => {
    alertFlappingData.push({
      id,
      flappingHistory: alert.getFlappingHistory() || [],
    });
  });

  let earlyRecoveredAlertIds: string[] = [];
  if (alertFlappingData.length > maxAlerts) {
    // alerts are sorted by age using the length of the flapping array
    alertFlappingData.sort((a, b) => {
      return a.flappingHistory.length - b.flappingHistory.length;
    });

    earlyRecoveredAlertIds = alertFlappingData.slice(maxAlerts).map((alert) => alert.id);
    logger.warn(
      `Recovered alerts have exceeded the max alert limit of ${maxAlerts} : dropping ${
        earlyRecoveredAlertIds.length
      } ${earlyRecoveredAlertIds.length > 1 ? 'alerts' : 'alert'}.`
    );
  }
  return earlyRecoveredAlertIds;
}
