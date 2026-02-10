/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import type { MutedAlertInstance, MuteCondition } from '@kbn/alerting-types';

/**
 * Result of evaluating mute conditions for a single alert instance.
 */
export interface MuteConditionEvalResult {
  /** Whether the alert should be automatically unmuted. */
  shouldUnmute: boolean;
  /** Human-readable reason the alert was unmuted (for event log / audit). */
  reason?: string;
}

/**
 * Evaluates whether a single `MuteCondition` is satisfied by the current alert data.
 */
function evaluateSingleCondition(
  condition: MuteCondition,
  currentAlertData: Record<string, unknown>
): { met: boolean; reason: string } {
  const currentValue = get(currentAlertData, condition.field);
  const currentStr = currentValue != null ? String(currentValue) : undefined;

  switch (condition.type) {
    case 'severity_change':
    case 'field_change': {
      if (condition.snapshotValue == null) {
        // No snapshot to compare against -- condition cannot be evaluated
        return { met: false, reason: '' };
      }
      const changed = currentStr !== condition.snapshotValue;
      return {
        met: changed,
        reason: changed
          ? `Field '${condition.field}' changed from '${condition.snapshotValue}' to '${currentStr ?? 'undefined'}'`
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
 * Evaluates all conditions on a `MutedAlertInstance` against the current alert data.
 *
 * Supports compound conditions:
 * - `conditionOperator: 'any'` (default) -- unmute if ANY single condition OR time expiry is met.
 * - `conditionOperator: 'all'` -- unmute only when ALL conditions AND time expiry are met.
 *
 * @param mutedAlert The muted-alert entry from the Rule saved object.
 * @param currentAlertData A flat or nested record representing current alert field values.
 * @returns An evaluation result indicating whether the alert should be unmuted.
 */
export function evaluateMuteConditions(
  mutedAlert: MutedAlertInstance,
  currentAlertData: Record<string, unknown>
): MuteConditionEvalResult {
  const operator = mutedAlert.conditionOperator ?? 'any';
  const results: Array<{ met: boolean; reason: string }> = [];

  // Check time expiry first
  if (mutedAlert.expiresAt) {
    const expired = new Date(mutedAlert.expiresAt).getTime() <= Date.now();
    results.push({
      met: expired,
      reason: expired ? `Time expiry reached (${mutedAlert.expiresAt})` : '',
    });
  }

  // Evaluate each explicit condition
  if (mutedAlert.conditions) {
    for (const condition of mutedAlert.conditions) {
      results.push(evaluateSingleCondition(condition, currentAlertData));
    }
  }

  // No conditions and no expiry means indefinite mute -- never auto-unmute
  if (results.length === 0) {
    return { shouldUnmute: false };
  }

  if (operator === 'any') {
    const firstMet = results.find((r) => r.met);
    return firstMet
      ? { shouldUnmute: true, reason: firstMet.reason }
      : { shouldUnmute: false };
  }

  // operator === 'all'
  const allMet = results.every((r) => r.met);
  return allMet
    ? {
        shouldUnmute: true,
        reason: results.map((r) => r.reason).filter(Boolean).join('; '),
      }
    : { shouldUnmute: false };
}
