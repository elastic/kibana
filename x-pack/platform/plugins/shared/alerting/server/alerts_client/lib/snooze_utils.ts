/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import {
  ALERT_SNOOZE_CONDITIONS,
  ALERT_SNOOZE_CONDITION_OPERATOR,
  ALERT_SNOOZE_EXPIRES_AT,
  ALERT_SNOOZE_SNAPSHOT,
} from '@kbn/rule-data-utils';

/**
 * Returns whether the alert document has per-alert conditional snooze configuration
 * (time-based expiry and/or condition-based). Used to distinguish simple rule-SO mute
 * from AAD-stored snooze when determining muted status and when preserving snooze fields.
 */
export const hasConditionalSnooze = (
  existingAlert?: Record<string, unknown>
): boolean => {
  if (!existingAlert) {
    return false;
  }
  const expiresAt = get(existingAlert, ALERT_SNOOZE_EXPIRES_AT);
  const conditions = get(existingAlert, ALERT_SNOOZE_CONDITIONS);
  const hasConditions = Array.isArray(conditions) && conditions.length > 0;
  return expiresAt != null || hasConditions;
};

/**
 * Returns whether the alert has condition-based snooze (non-empty conditions array).
 * Used when building recovered alerts to decide whether to preserve or clear condition fields.
 */
export const hasSnoozeConditions = (alert: Record<string, unknown>): boolean => {
  const conditions = get(alert, ALERT_SNOOZE_CONDITIONS);
  return Array.isArray(conditions) && conditions.length > 0;
};

const SNOOZE_FIELD_KEYS = [
  ALERT_SNOOZE_EXPIRES_AT,
  ALERT_SNOOZE_CONDITIONS,
  ALERT_SNOOZE_CONDITION_OPERATOR,
  ALERT_SNOOZE_SNAPSHOT,
] as const;

/**
 * Returns an object containing only the defined snooze fields from the alert document.
 * Used when merging preserved snooze state into a new or updated alert (e.g. build_new_alert).
 * Omits keys whose value is undefined so deepmerge does not overwrite with undefined.
 */
export const getSnoozeFieldsToPreserve = (
  alert: Record<string, unknown>
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  for (const key of SNOOZE_FIELD_KEYS) {
    const value = get(alert, key);
    if (value !== undefined) {
      out[key] = value;
    }
  }
  return out;
};
