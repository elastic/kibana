/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MutedAlertInstance } from '@kbn/alerting-types';

/**
 * Combines legacy `mutedInstanceIds` and the newer `mutedAlerts` entries
 * into a single de-duplicated array of alert instance IDs.
 *
 * This is used by summary and system action schedulers to determine which
 * alerts should be excluded from action scheduling.
 */
export function getAllMutedAlertInstanceIds(rule: {
  mutedInstanceIds?: string[];
  mutedAlerts?: MutedAlertInstance[];
}): string[] {
  const legacyIds = rule.mutedInstanceIds ?? [];
  const mutedAlerts = rule.mutedAlerts;
  if (!mutedAlerts || mutedAlerts.length === 0) {
    return legacyIds;
  }
  const mutedAlertIds = mutedAlerts.map((entry) => entry.alertInstanceId);
  return [...new Set([...legacyIds, ...mutedAlertIds])];
}
