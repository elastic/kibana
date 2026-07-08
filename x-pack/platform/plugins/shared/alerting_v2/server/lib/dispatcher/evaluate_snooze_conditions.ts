/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEqual } from 'lodash';
import type { SnoozeCondition, SnoozeConditionOperator } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode, SnoozeBaseline } from './types';

// Sentinel routing a condition to the episode's top-level `severity` rather than a `data.*` path.
// (Ported from Alerting V1, which used the `kibana.alert.severity` AAD field; V2 has no such field.)
const SEVERITY_KEY = '__severity__';

/**
 * Evaluates conditional-snooze conditions for a single episode. Conditions describe when the snooze
 * should auto-LIFT: `all` lifts only when every condition is met, `any` (the default) lifts on the
 * first met. Mirrors Alerting V1's `shouldUnsnoozeByConditions`, sourcing the "value at snooze time"
 * from the `.rule-events` history baseline instead of a stored snapshot.
 *
 * @returns `true` when the snooze no longer holds and the episode should become dispatchable.
 */
export const shouldUnsnoozeByConditions = (
  conditions: SnoozeCondition[],
  conditionOperator: SnoozeConditionOperator | undefined,
  baseline: SnoozeBaseline | undefined,
  episode: AlertEpisode
): boolean => {
  const operator = conditionOperator ?? 'any';
  const predicate = (condition: SnoozeCondition) =>
    evaluateSingleCondition(condition, baseline, episode);

  return operator === 'all' ? conditions.every(predicate) : conditions.some(predicate);
};

const evaluateSingleCondition = (
  condition: SnoozeCondition,
  baseline: SnoozeBaseline | undefined,
  episode: AlertEpisode
): boolean => {
  if (condition.type === 'field_change') {
    return evaluateFieldChange(condition.field, baseline, episode);
  }
  if (condition.type === 'severity_change') {
    return evaluateFieldChange(SEVERITY_KEY, baseline, episode);
  }
  if (condition.type === 'severity_equals') {
    return getCurrentValue(episode, SEVERITY_KEY) === condition.value;
  }
  return false;
};

const evaluateFieldChange = (
  fieldPath: string,
  baseline: SnoozeBaseline | undefined,
  episode: AlertEpisode
): boolean => {
  const baselineValue = getBaselineValue(baseline, fieldPath);
  // No baseline value recorded at snooze time → cannot detect a change → keep the snooze (matches V1).
  if (baselineValue === undefined) {
    return false;
  }

  const current = getCurrentValue(episode, fieldPath) ?? null;
  return !isEqual(current, baselineValue);
};

const getCurrentValue = (episode: AlertEpisode, fieldPath: string): unknown =>
  fieldPath === SEVERITY_KEY ? episode.severity : get(episode.data, fieldPath);

const getBaselineValue = (baseline: SnoozeBaseline | undefined, fieldPath: string): unknown =>
  fieldPath === SEVERITY_KEY ? baseline?.severity : get(baseline?.data, fieldPath);
