/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SnoozedAlertInstance } from '@kbn/alerting-types';

/**
 * Combines legacy `mutedInstanceIds` and the newer `snoozedAlerts` entries
 * into a single de-duplicated array of alert instance IDs.
 *
 * This is used by summary and system action schedulers to determine which
 * alerts should be excluded from action scheduling.
 */
export function getAllSnoozedAlertInstanceIds(rule: {
  mutedInstanceIds?: string[];
  snoozedAlerts?: SnoozedAlertInstance[];
}): string[] {
  const legacyIds = rule.mutedInstanceIds ?? [];
  const snoozedAlerts = rule.snoozedAlerts;
  if (!snoozedAlerts || snoozedAlerts.length === 0) {
    return legacyIds;
  }
  const snoozedAlertIds = snoozedAlerts.map((entry) => entry.alertInstanceId);
  return [...new Set([...legacyIds, ...snoozedAlertIds])];
}
