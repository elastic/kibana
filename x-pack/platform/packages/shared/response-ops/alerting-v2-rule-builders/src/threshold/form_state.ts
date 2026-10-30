/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { AlertCondition, ThresholdFormValues } from './form_types';
import { generateId } from './form_types';
import type { ThresholdParams } from './params_schema';

type ConditionParams = ThresholdParams['alertConditions'][number];

const toFormCondition = (condition: ConditionParams): AlertCondition => ({
  id: generateId(),
  metric: condition.metric,
  comparator: condition.comparator,
  threshold: [...condition.threshold],
});

const fromFormCondition = ({ metric, comparator, threshold }: AlertCondition): ConditionParams => ({
  metric,
  comparator,
  threshold: [...threshold],
});

/** Converts threshold builder params into form values, assigning the UI-only ids. */
export const toThresholdFormState = (params: ThresholdParams): ThresholdFormValues => ({
  indexPattern: params.indexPattern,
  timeField: params.timeField,
  ...(params.filterQuery !== undefined ? { filterQuery: params.filterQuery } : {}),
  stats: params.stats.map((stat) => ({ id: generateId(), ...stat })),
  evaluations: params.evaluations.map((evaluation) => ({ id: generateId(), ...evaluation })),
  alertConditions: params.alertConditions.map(toFormCondition),
  conditionOperator: params.conditionOperator,
  groupByFields: [...params.groupByFields],
  ...(params.recovery
    ? {
        recovery: {
          conditions: params.recovery.conditions.map(toFormCondition),
          conditionOperator: params.recovery.conditionOperator,
        },
      }
    : {}),
  ...(params.severity
    ? {
        severity: {
          mode: params.severity.mode,
          singleLevelSeverity: params.severity.singleLevelSeverity,
          levels: params.severity.levels.map((level) => ({ id: generateId(), ...level })),
        },
      }
    : {}),
});

/** Converts threshold builder form values into params, dropping the UI-only ids. */
export const fromThresholdFormState = (values: ThresholdFormValues): ThresholdParams => ({
  indexPattern: values.indexPattern,
  timeField: values.timeField,
  ...(values.filterQuery !== undefined ? { filterQuery: values.filterQuery } : {}),
  stats: values.stats.map(({ label, aggregation, field, filter }) => ({
    label,
    aggregation,
    ...(field !== undefined ? { field } : {}),
    ...(filter !== undefined ? { filter } : {}),
  })),
  evaluations: values.evaluations.map(({ label, expression }) => ({ label, expression })),
  alertConditions: values.alertConditions.map(fromFormCondition),
  conditionOperator: values.conditionOperator,
  groupByFields: [...values.groupByFields],
  ...(values.recovery
    ? {
        recovery: {
          conditions: values.recovery.conditions.map(fromFormCondition),
          conditionOperator: values.recovery.conditionOperator,
        },
      }
    : {}),
  ...(values.severity
    ? {
        severity: {
          mode: values.severity.mode,
          singleLevelSeverity: values.severity.singleLevelSeverity,
          levels: values.severity.levels.map(({ severity, threshold }) => ({
            severity,
            threshold,
          })),
        },
      }
    : {}),
});
