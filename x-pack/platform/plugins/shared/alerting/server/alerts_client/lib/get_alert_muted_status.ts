/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertRuleData } from '../types';

/** Legacy alert with optional snooze config (from getSnoozeConfig). */
interface LegacyAlertWithSnooze {
  getSnoozeConfig(): unknown;
}

/**
 * Determines whether an alert instance is considered muted for the purpose of
 * materializing the `ALERT_MUTED` field on the alert-as-data document.
 *
 * A snoozed alert is muted from the moment its snooze entry exists in
 * `snoozedInstances` on the rule SO, regardless of whether snooze conditions
 * have been evaluated. Condition evaluation (which may lift the snooze) happens
 * separately in the scheduler's `evaluateSnoozeForAlert` pass.
 *
 * When legacyAlert is provided, snooze is determined from alert.getSnoozeConfig()
 * instead of ruleData.snoozedInstances.
 */
export function getAlertMutedStatus(
  alertInstanceId: string,
  ruleData?: AlertRuleData,
  legacyAlert?: LegacyAlertWithSnooze
): boolean {
  if (!ruleData) {
    return false;
  }

  if (ruleData.muteAll || ruleData.mutedInstanceIdsSet.has(alertInstanceId)) {
    return true;
  }

  if (legacyAlert?.getSnoozeConfig() != null) {
    return true;
  }

  return ruleData.snoozedInstanceIdsSet.has(alertInstanceId);
}
