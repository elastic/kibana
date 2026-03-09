/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { SnoozedInstanceConfig } from '../snooze_types';
import { snoozeConditionOperator } from '../../../common/routes/rule/common/constants/v1';

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
 * Converts a field value to a canonical string for comparison with snapshot/target
 * values (which are always strings per the API schema).
 *
 * Returns `undefined` for unsupported types, causing the condition to bail out
 * (treat as "not met").
 *
 * Supported types:
 * - `string`  -- returned as-is (keyword fields like `kibana.alert.severity`)
 * - `number`  -- `String(value)` for finite values; `undefined` for NaN/Infinity
 * - `boolean` -- `"true"` / `"false"`
 * - `Date`    -- `.toISOString()` (canonical ISO 8601)
 * - `null` / `undefined` -- `undefined`
 * - objects, arrays, symbols, functions -- `undefined`
 */
export function toComparableString(value: unknown): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : undefined;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  return undefined;
}

/**
 * Evaluates whether a single `SnoozeCondition` is satisfied by the current alert data.
 *
 * Field values are normalized to canonical strings via {@link toComparableString}
 * before comparison. This handles string, number, boolean, and Date types reliably.
 * Complex values (objects, arrays) are unsupported and cause the condition to bail
 * out (not met).
 */
function evaluateSingleCondition(
  condition: NonNullable<SnoozedInstanceConfig['conditions']>[number],
  currentAlertData: Record<string, unknown>
): { met: boolean; reason: string } {
  const currentValue = get(currentAlertData, condition.field);
  const currentStr = toComparableString(currentValue);

  switch (condition.type) {
    case 'severity_change':
    case 'field_change': {
      if (condition.snapshotValue == null || currentStr == null) {
        return { met: false, reason: '' };
      }
      const changed = currentStr !== condition.snapshotValue;
      return {
        met: changed,
        reason: changed
          ? `Field '${condition.field}' changed from '${condition.snapshotValue}' to '${currentStr}'`
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
  snoozeConfig: SnoozedInstanceConfig,
  currentAlertData: Record<string, unknown>
): SnoozeConditionEvalResult {
  const operator = snoozeConfig.conditionOperator ?? snoozeConditionOperator.ANY;
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

  if (operator === snoozeConditionOperator.ANY) {
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
