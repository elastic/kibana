/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get } from 'lodash';
import { ALERT_SEVERITY } from '@kbn/rule-data-utils';
import type { RawRuleSnoozedInstance } from '../../saved_objects/schemas/raw_rule';

type SnoozeCondition = NonNullable<RawRuleSnoozedInstance['conditions']>[number];

export interface EvaluatePerAlertSnoozeConditionsResult {
  conditionExpiredInstances: RawRuleSnoozedInstance[];
}

/**
 * Evaluates field-change-based unsnooze conditions for each time-active snoozed
 * instance. An instance is condition-expired when its conditions indicate the
 * snooze should be lifted (e.g. a tracked field changed from the snapshot value).
 *
 * @param activeSnoozedInstances - Instances that are still time-active (not yet
 *   expired by `expiresAt`). Only these are candidates for condition evaluation.
 * @param alertAsDataByInstanceId - Map of alert instanceId → raw alert-as-data
 *   document for currently active alerts. Instances not present in this map are
 *   skipped (alert is not currently firing or has no AAD).
 */
export const evaluatePerAlertSnoozeConditions = (
  activeSnoozedInstances: RawRuleSnoozedInstance[],
  alertAsDataByInstanceId: Map<string, Record<string, unknown>>
): EvaluatePerAlertSnoozeConditionsResult => {
  const conditionExpiredInstances: RawRuleSnoozedInstance[] = [];

  for (const instance of activeSnoozedInstances) {
    if (!instance.conditions || instance.conditions.length === 0) {
      continue;
    }

    const alertAsData = alertAsDataByInstanceId.get(instance.instanceId);
    if (alertAsData === undefined) {
      continue;
    }

    if (shouldUnsnoozeByConditions(instance, alertAsData)) {
      conditionExpiredInstances.push(instance);
    }
  }

  console.log('evaluatePerAlertSnoozeConditions', { conditionExpiredInstances });
  return { conditionExpiredInstances };
};

/**
 * Reads a field value from an alert-as-data document that may use either
 * flat dot-notation keys (as produced by AlertBuilder for framework fields)
 * or nested object structure (as returned from ES queries). Flat key takes
 * priority since it reflects the current execution's computed value.
 */
const getAlertFieldValue = (alertAsData: Record<string, unknown>, fieldPath: string): unknown => {
  if (Object.prototype.hasOwnProperty.call(alertAsData, fieldPath)) {
    return alertAsData[fieldPath];
  }
  return get(alertAsData, fieldPath);
};

const shouldUnsnoozeByConditions = (
  instance: RawRuleSnoozedInstance,
  alertAsData: Record<string, unknown>
): boolean => {
  const conditions = instance.conditions!;
  const operator = instance.conditionOperator ?? 'any';

  if (operator === 'all') {
    return conditions.every((condition) =>
      evaluateSingleCondition(condition, instance.snoozeSnapshot, alertAsData)
    );
  }

  return conditions.some((condition) =>
    evaluateSingleCondition(condition, instance.snoozeSnapshot, alertAsData)
  );
};

const evaluateSingleCondition = (
  condition: SnoozeCondition,
  snoozeSnapshot: RawRuleSnoozedInstance['snoozeSnapshot'],
  alertAsData: Record<string, unknown>
): boolean => {
  console.log('evaluateSingleCondition', { condition, snoozeSnapshot, alertAsData });
  if (condition.type === 'field_change') {
    return evaluateFieldChange(condition.field, snoozeSnapshot, alertAsData);
  }
  if (condition.type === 'severity_change') {
    return evaluateFieldChange(ALERT_SEVERITY, snoozeSnapshot, alertAsData);
  }
  if (condition.type === 'severity_equals') {
    return getAlertFieldValue(alertAsData, ALERT_SEVERITY) === condition.value;
  }
  return false;
};

const evaluateFieldChange = (
  fieldPath: string,
  snoozeSnapshot: RawRuleSnoozedInstance['snoozeSnapshot'],
  alertAsData: Record<string, unknown>
): boolean => {
  if (!snoozeSnapshot || !(fieldPath in snoozeSnapshot)) {
    return false;
  }
  console.log('evaluateFieldChange', {
    fieldPath,
    snoozeSnapshot: snoozeSnapshot[fieldPath],
    alertAsData: getAlertFieldValue(alertAsData, fieldPath),
  });
  return getAlertFieldValue(alertAsData, fieldPath) !== snoozeSnapshot[fieldPath];
};
