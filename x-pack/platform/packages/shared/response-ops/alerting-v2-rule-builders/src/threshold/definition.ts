/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getBreachEsqlQuery,
  getRecoverEsqlQuery,
  recoveryStrategy,
  type Query,
} from '@kbn/alerting-v2-schemas';
import type { RuleBuilderType } from '../types';
import { splitQuery } from '../split_query';
import type { AlertCondition, ThresholdFormValues } from './form_types';
import { Comparator, getAvailableMetricLabels, reconcileAlertConditionMetrics } from './form_types';
import type { ThresholdParams } from './params_schema';
import { thresholdParamsSchema } from './params_schema';
import { fromThresholdFormState, toThresholdFormState } from './form_state';
import { buildRecoveryBlock, buildThresholdEsql } from './build_esql';
import { parseThresholdEsql } from './parse_esql';
import { getThresholdValidationErrors } from './validate';

export const THRESHOLD_BUILDER_TYPE = 'threshold';

const RANGE_COMPARATORS: readonly Comparator[] = [Comparator.BETWEEN, Comparator.NOT_BETWEEN];

const getConditionErrors = (
  conditions: AlertCondition[],
  availableLabels: string[],
  kind: 'Alert' | 'Recovery'
): string[] =>
  conditions.flatMap(({ metric, comparator, threshold }) => {
    const errors: string[] = [];
    if (!availableLabels.includes(metric)) {
      errors.push(
        `${kind} condition metric "${metric}" is not a stat or evaluation label. Available labels: ${availableLabels.join(
          ', '
        )}.`
      );
    }
    const expectedThresholds = RANGE_COMPARATORS.includes(comparator) ? 2 : 1;
    if (threshold.length !== expectedThresholds) {
      errors.push(
        `${kind} condition on "${metric}" with comparator "${comparator}" needs exactly ${expectedThresholds} threshold value(s).`
      );
    }
    return errors;
  });

/**
 * Params-level validation: the form-level checks plus the checks the form covers
 * by construction (metrics chosen from a list, one input per threshold).
 */
const validateThresholdParams = (params: ThresholdParams): string[] => {
  const values = toThresholdFormState(params);
  const availableLabels = getAvailableMetricLabels(values.stats, values.evaluations);

  return [
    ...getThresholdValidationErrors(values),
    ...getConditionErrors(values.alertConditions, availableLabels, 'Alert'),
    ...getConditionErrors(values.recovery?.conditions ?? [], availableLabels, 'Recovery'),
  ];
};

const buildQuery = (esqlQuery: string, isAlert: boolean): Query => {
  if (!isAlert) return { base: esqlQuery };
  const { base, alertBlock } = splitQuery(esqlQuery);
  return alertBlock ? { base, breach: { segment: alertBlock } } : { base };
};

export const thresholdRuleBuilderType: RuleBuilderType<ThresholdParams, ThresholdFormValues> = {
  type: THRESHOLD_BUILDER_TYPE,
  toolName: 'draft_threshold_rule',
  title: 'Threshold',
  summary:
    'Aggregates documents from one index pattern (count, avg, sum, min, max, cardinality, p95, p99), optionally per group and with derived ratios, and alerts when the values cross fixed thresholds. Supports per-stat filters, a recovery condition and single or multi-level severity.',
  whenToUse:
    'Use when the user wants to be alerted when a count, average, sum, min, max, distinct count, percentile or ratio of those over one index goes above, below, between or outside fixed values, optionally per host, service or other group.',
  paramsSchema: thresholdParamsSchema,
  toFormState: toThresholdFormState,
  fromFormState: fromThresholdFormState,
  validate: validateThresholdParams,
  build: (params, { kind }) => {
    const isAlert = kind === 'alert';
    const values = toThresholdFormState(params);
    const recoverySegment = isAlert ? buildRecoveryBlock(values) : undefined;

    return {
      query: buildQuery(buildThresholdEsql(values), isAlert),
      time_field: values.timeField,
      ...(values.groupByFields.length > 0 ? { grouping: { fields: values.groupByFields } } : {}),
      ...(recoverySegment
        ? { recovery: { strategy: recoveryStrategy.condition, segment: recoverySegment } }
        : {}),
    };
  },
  parse: ({ query, recovery, time_field: timeField }) => {
    const values = parseThresholdEsql(
      getBreachEsqlQuery(query),
      getRecoverEsqlQuery(query, recovery)
    );
    if (!values) return null;

    return fromThresholdFormState({
      ...values,
      ...(timeField ? { timeField } : {}),
      alertConditions: reconcileAlertConditionMetrics(
        values.alertConditions,
        values.stats,
        values.evaluations
      ),
    });
  },
};
