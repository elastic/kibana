/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ALERT_MUTED } from '@kbn/rule-data-utils';
import type { AlertRuleData } from '../types';
import { hasConditionalSnooze } from './snooze_utils';

export { hasConditionalSnooze } from './snooze_utils';

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
