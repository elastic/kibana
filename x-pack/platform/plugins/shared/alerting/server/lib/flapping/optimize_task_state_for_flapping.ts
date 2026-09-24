/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map } from 'lodash';
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
  const alertIdsOverMaxLimit = getAlertIdsOverMaxLimit(recoveredAlerts, maxAlerts);
  if (alertIdsOverMaxLimit.length > 0) {
    logger.warn(
      `Recovered alerts have exceeded the max alert limit of ${maxAlerts} : dropping ${
        alertIdsOverMaxLimit.length
      } ${alertIdsOverMaxLimit.length > 1 ? 'alerts' : 'alert'}.`
    );
  }

  for (const id of getRecoveredAlertIdsToStopTracking(recoveredAlerts, maxAlerts)) {
    delete recoveredAlerts[id];
  }
  return recoveredAlerts;
}

export function shouldKeepTrackingRecovered({
  flapping,
  flappingHistory,
}: {
  flapping?: boolean;
  flappingHistory?: boolean[];
}): boolean {
  const numStateChanges = (flappingHistory || []).filter((f) => f).length;
  return flapping === true || numStateChanges > 0;
}

interface RecoveredAlertTrackingFields {
  getFlappingHistory: () => boolean[] | undefined;
  getFlapping?: () => boolean | undefined;
}

export function getRecoveredAlertIdsToStopTracking(
  trackedRecoveredAlerts: Record<string, RecoveredAlertTrackingFields>,
  maxAlerts: number
): string[] {
  const overMaxIds = getAlertIdsOverMaxLimit(trackedRecoveredAlerts, maxAlerts);
  const overMax = new Set(overMaxIds);
  const ids = [...overMaxIds];

  for (const [id, alert] of Object.entries(trackedRecoveredAlerts)) {
    if (overMax.has(id)) {
      continue;
    }
    if (
      !shouldKeepTrackingRecovered({
        flapping: alert.getFlapping?.(),
        flappingHistory: alert.getFlappingHistory(),
      })
    ) {
      ids.push(id);
    }
  }

  return ids;
}

export function getAlertIdsOverMaxLimit(
  trackedRecoveredAlerts: Record<string, { getFlappingHistory: () => boolean[] | undefined }>,
  maxAlerts: number
): string[] {
  const alerts = map(trackedRecoveredAlerts, (alert, id) => {
    return {
      id,
      flappingHistory: alert.getFlappingHistory() || [],
    };
  });

  if (alerts.length <= maxAlerts) {
    return [];
  }

  // alerts are sorted by age using the length of the flapping array
  alerts.sort((a, b) => {
    return a.flappingHistory.length - b.flappingHistory.length;
  });

  return alerts.slice(maxAlerts).map((alert) => alert.id);
}
