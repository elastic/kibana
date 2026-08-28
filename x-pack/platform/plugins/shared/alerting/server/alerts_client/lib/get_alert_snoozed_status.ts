/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertRuleData } from '../types';

export function getAlertSnoozedStatus(alertInstanceId: string, ruleData?: AlertRuleData): boolean {
  if (!ruleData) {
    return false;
  }

  // A per-alert "snooze indefinitely" reuses the mute API, so it is stored in
  // `mutedInstanceIds`. Treat those instances as snoozed too, so the alert reflects
  // `snoozed: true` for indefinite snoozes.
  if (ruleData.mutedInstanceIds.includes(alertInstanceId)) {
    return true;
  }

  return Boolean(
    ruleData.snoozedInstances?.some((instance) => instance.instanceId === alertInstanceId)
  );
}
