/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { get, isEqual } from 'lodash';
import type { SnoozeCondition, SnoozeConditionsMatch } from '@kbn/alerting-v2-schemas';
import type { AlertEpisode, SnoozeBaseline } from './types';

// Condition fields address either the episode's top-level `severity` or a `data.`-prefixed
// episode data path (enforced by the API schema).
const DATA_FIELD_PREFIX = 'data.';

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
  match: SnoozeConditionsMatch | undefined,
  baseline: SnoozeBaseline | undefined,
  episode: AlertEpisode
): boolean => {
  const predicate = (condition: SnoozeCondition) =>
    evaluateSingleCondition(condition, baseline, episode);

  return (match ?? 'any') === 'all' ? conditions.every(predicate) : conditions.some(predicate);
};

const evaluateSingleCondition = (
  condition: SnoozeCondition,
  baseline: SnoozeBaseline | undefined,
  episode: AlertEpisode
): boolean => {
  if (condition.operator === 'eq') {
    return getFieldValue(condition.field, episode) === condition.value;
  }
  if (condition.operator === 'changed') {
    return evaluateFieldChange(condition.field, baseline, episode);
  }
  return false;
};

const evaluateFieldChange = (
  field: string,
  baseline: SnoozeBaseline | undefined,
  episode: AlertEpisode
): boolean => {
  // Without a baseline (no event history before the snooze) we can't compare, so keep the snooze.
  if (!baseline) {
    return false;
  }

  // A field missing from the baseline had no value at snooze time (null, as in V1). If it
  // appears later, it must count as a change.
  const baselineValue = getFieldValue(field, baseline) ?? null;
  const current = getFieldValue(field, episode) ?? null;
  return !isEqual(current, baselineValue);
};

const getFieldValue = (
  field: string,
  source: Pick<AlertEpisode, 'severity' | 'data'> | undefined
): unknown => {
  if (!source) {
    return undefined;
  }
  if (field === 'severity') {
    return source.severity;
  }
  if (field.startsWith(DATA_FIELD_PREFIX)) {
    return get(source.data, field.slice(DATA_FIELD_PREFIX.length));
  }
  return undefined;
};
