/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  thresholdBuilderFieldsSchema,
  type ThresholdBuilderFields,
} from '@kbn/alerting-v2-rule-builders';
import { generateId, type ThresholdFormValues } from './form_types';

/**
 * Projects the threshold form onto the persisted `metadata.builder_fields`
 * shape, dropping the React list keys the server's strict schema rejects.
 */
export const thresholdFormValuesToBuilderFields = (
  values: ThresholdFormValues
): ThresholdBuilderFields => ({
  indexPattern: values.indexPattern,
  timeField: values.timeField,
  ...(values.filterQuery ? { filterQuery: values.filterQuery } : {}),
  stats: values.stats.map(({ id, ...stat }) => stat),
  evaluations: values.evaluations.map(({ id, ...evaluation }) => evaluation),
  alertConditions: values.alertConditions.map(({ id, ...condition }) => condition),
  conditionOperator: values.conditionOperator,
  groupByFields: values.groupByFields,
  ...(values.recovery
    ? {
        recovery: {
          conditions: values.recovery.conditions.map(({ id, ...condition }) => condition),
          conditionOperator: values.recovery.conditionOperator,
        },
      }
    : {}),
});

/**
 * Rebuilds the threshold form from persisted builder fields, re-keying the list
 * rows. Returns `null` for fields this version of the form cannot represent —
 * for instance a rule written by a newer Kibana — so the caller can fall back to
 * ES|QL mode instead of silently dropping configuration.
 */
export const thresholdBuilderFieldsToFormValues = (
  fields: Record<string, unknown>
): ThresholdFormValues | null => {
  const parsed = thresholdBuilderFieldsSchema.safeParse(fields);
  if (!parsed.success) {
    return null;
  }

  const {
    indexPattern,
    timeField,
    filterQuery,
    stats,
    evaluations,
    alertConditions,
    conditionOperator,
    groupByFields,
    recovery,
  } = parsed.data;

  return {
    indexPattern,
    timeField,
    ...(filterQuery ? { filterQuery } : {}),
    stats: stats.map((stat) => ({ ...stat, id: generateId() })),
    evaluations: evaluations.map((evaluation) => ({ ...evaluation, id: generateId() })),
    alertConditions: alertConditions.map((condition) => ({ ...condition, id: generateId() })),
    conditionOperator,
    groupByFields,
    ...(recovery
      ? {
          recovery: {
            conditions: recovery.conditions.map((condition) => ({
              ...condition,
              id: generateId(),
            })),
            conditionOperator: recovery.conditionOperator,
          },
        }
      : {}),
  };
};
