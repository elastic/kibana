/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  ALERT_MUTED,
  ALERT_SNOOZE_CONDITIONS,
  ALERT_SNOOZE_CONDITION_OPERATOR,
  ALERT_SNOOZE_EXPIRES_AT,
  ALERT_SNOOZE_SNAPSHOT,
} from '@kbn/rule-data-utils';

/** Snooze condition shape used in fixtures (matches API/alert doc). */
export interface SnoozeConditionFixture {
  type: 'severity_change' | 'severity_equals' | 'field_change';
  field: string;
  value?: string;
  snapshotValue?: string;
}

/**
 * Returns a partial alert document with time-only snooze (expires_at, no conditions).
 * Useful for tests that need an existingAlert or alert with time-based snooze.
 */
export const createTimeOnlySnoozeAlert = (
  expiresAt: string
): Record<string, unknown> => ({
  [ALERT_MUTED]: true,
  [ALERT_SNOOZE_EXPIRES_AT]: expiresAt,
});

/**
 * Returns a partial alert document with full conditional snooze (expires_at + conditions + operator + snapshot).
 * Useful for tests that need an existingAlert or alert with condition-based snooze.
 */
export const createConditionalSnoozeAlert = (opts: {
  expiresAt: string;
  conditions: SnoozeConditionFixture[];
  conditionOperator?: 'any' | 'all';
  snapshot?: Record<string, string>;
}): Record<string, unknown> => ({
  [ALERT_MUTED]: true,
  [ALERT_SNOOZE_EXPIRES_AT]: opts.expiresAt,
  [ALERT_SNOOZE_CONDITIONS]: opts.conditions,
  [ALERT_SNOOZE_CONDITION_OPERATOR]: opts.conditionOperator ?? 'any',
  ...(opts.snapshot ? { [ALERT_SNOOZE_SNAPSHOT]: opts.snapshot } : {}),
});

/**
 * Returns a partial alert document with condition-only snooze (no expires_at).
 * Useful for tests that verify condition-only snooze is preserved across recovery.
 */
export const createConditionOnlySnoozeAlert = (opts: {
  conditions: SnoozeConditionFixture[];
  conditionOperator?: 'any' | 'all';
}): Record<string, unknown> => ({
  [ALERT_MUTED]: true,
  [ALERT_SNOOZE_CONDITIONS]: opts.conditions,
  [ALERT_SNOOZE_CONDITION_OPERATOR]: opts.conditionOperator ?? 'any',
});
