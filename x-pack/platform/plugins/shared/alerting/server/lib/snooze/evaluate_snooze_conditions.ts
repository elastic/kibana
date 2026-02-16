/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { SnoozeCondition } from '@kbn/alerting-types';

/**
 * Result of evaluating snooze conditions for a single alert instance.
 */
export interface SnoozeConditionEvalResult {
  /** Whether the alert should be automatically unmuted. */
  shouldUnmute: boolean;
  /** Human-readable reason the alert was unmuted (for event log / audit). */
  reason?: string;
}

/**
 * Snooze configuration extracted from an alert-as-data document.
 */
export interface AlertSnoozeConfig {
  expiresAt?: string;
  conditions?: SnoozeCondition[];
  conditionOperator?: 'any' | 'all';
}

/**
 * Evaluates whether a single `SnoozeCondition` is satisfied by the current alert data.
 *
 * **Limitation**: Field values are coerced to strings via `String()` before comparison.
 * This works reliably for primitive values (string, number, boolean) which are the
 * expected types for monitored fields like `kibana.alert.severity`. Complex values
 * (objects, arrays) will stringify to `[object Object]` or comma-joined elements,
 * making condition matches effectively impossible for non-primitive fields.
 */
function evaluateSingleCondition(
  condition: SnoozeCondition,
  currentAlertData: Record<string, unknown>
): { met: boolean; reason: string } {
  const currentValue = get(currentAlertData, condition.field);
  // Coerce to string for comparison -- see JSDoc above for limitations on non-primitive values.
  const currentStr = currentValue != null ? String(currentValue) : undefined;

  switch (condition.type) {
    case 'severity_change':
    case 'field_change': {
      if (condition.snapshotValue == null) {
        return { met: false, reason: '' };
      }
      const changed = currentStr !== condition.snapshotValue;
      return {
        met: changed,
        reason: changed
          ? `Field '${condition.field}' changed from '${condition.snapshotValue}' to '${
              currentStr ?? 'undefined'
            }'`
          : '',
      };
    }

    case 'severity_equals': {
      if (condition.value == null) {
        return { met: false, reason: '' };
      }
      const equals = currentStr === condition.value;
      return {
        met: equals,
        reason: equals
          ? `Field '${condition.field}' reached target value '${condition.value}'`
          : '',
      };
    }

    default:
      return { met: false, reason: '' };
  }
}

/**
 * Evaluates all snooze conditions against the current alert data.
 *
 * Supports compound conditions:
 * - `conditionOperator: 'any'` (default) -- unmute if ANY single condition OR time expiry is met.
 * - `conditionOperator: 'all'` -- unmute only when ALL conditions AND time expiry are met.
 */
export function evaluateSnoozeConditions(
  snoozeConfig: AlertSnoozeConfig,
  currentAlertData: Record<string, unknown>
): SnoozeConditionEvalResult {
  const operator = snoozeConfig.conditionOperator ?? 'any';
  const results: Array<{ met: boolean; reason: string }> = [];

  // Check time expiry first
  if (snoozeConfig.expiresAt) {
    const expired = new Date(snoozeConfig.expiresAt).getTime() <= Date.now();
    results.push({
      met: expired,
      reason: expired ? `Time expiry reached (${snoozeConfig.expiresAt})` : '',
    });
  }

  // Evaluate each explicit condition
  if (snoozeConfig.conditions) {
    for (const condition of snoozeConfig.conditions) {
      results.push(evaluateSingleCondition(condition, currentAlertData));
    }
  }

  // No conditions and no expiry means indefinite mute -- never auto-unmute
  if (results.length === 0) {
    return { shouldUnmute: false };
  }

  if (operator === 'any') {
    const firstMet = results.find((r) => r.met);
    return firstMet ? { shouldUnmute: true, reason: firstMet.reason } : { shouldUnmute: false };
  }

  // operator === 'all'
  const allMet = results.every((r) => r.met);
  return allMet
    ? {
        shouldUnmute: true,
        reason: results
          .map((r) => r.reason)
          .filter(Boolean)
          .join('; '),
      }
    : { shouldUnmute: false };
}
