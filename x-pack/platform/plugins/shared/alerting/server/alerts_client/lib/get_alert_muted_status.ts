/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import {
  ALERT_MUTED,
  ALERT_SNOOZE_CONDITIONS,
  ALERT_SNOOZE_EXPIRES_AT,
} from '@kbn/rule-data-utils';
import type { AlertRuleData } from '../types';

const hasConditionalSnooze = (existingAlert?: Record<string, unknown>): boolean => {
  if (!existingAlert) {
    return false;
  }

  const expiresAt = get(existingAlert, ALERT_SNOOZE_EXPIRES_AT);
  const conditions = get(existingAlert, ALERT_SNOOZE_CONDITIONS);
  const hasConditions = Array.isArray(conditions) && conditions.length > 0;

  return expiresAt != null || hasConditions;
};

export function getAlertMutedStatus(
  alertInstanceId: string,
  ruleData?: AlertRuleData,
  existingAlert?: Record<string, unknown>
): boolean {
  const isMutedByRuleSo =
    !!ruleData?.muteAll || !!ruleData?.mutedInstanceIds.includes(alertInstanceId);
  if (isMutedByRuleSo) {
    return true;
  }

  // Preserve per-alert conditional snoozes that are stored on alert documents.
  return get(existingAlert, ALERT_MUTED) === true && hasConditionalSnooze(existingAlert);
}
