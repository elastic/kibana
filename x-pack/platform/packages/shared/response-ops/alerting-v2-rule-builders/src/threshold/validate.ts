/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SeverityValidationError, ThresholdFormValues } from './form_types';
import {
  areAllStatsValid,
  getAvailableMetricLabels,
  getSeverityValidationError,
  hasReservedSeverityLabel,
  isMultiSeveritySupported,
  isSeveritySupported,
  SEVERITY_COLUMN,
} from './form_types';
import { getInvalidExpressionReferences } from './validate_metric_references';

const SEVERITY_VALIDATION_MESSAGES: Record<SeverityValidationError, string> = {
  invalid_threshold: 'Multi severity needs at least two levels, each with a finite threshold.',
  duplicate_level: 'Each severity can only be used by one level.',
  duplicate_threshold: 'Severity level thresholds must be unique.',
  threshold_order: 'More severe levels must have more extreme thresholds.',
  threshold_below_condition:
    'Every severity level threshold must be at or beyond the alert condition threshold.',
};

const getSeverityErrors = (values: ThresholdFormValues): string[] => {
  const { severity, alertConditions, stats, evaluations, groupByFields } = values;
  if (!severity) return [];

  if (!isSeveritySupported(alertConditions)) {
    return ['Severity requires exactly one alert condition.'];
  }
  if (hasReservedSeverityLabel(stats, evaluations, groupByFields)) {
    return [
      `Severity is unavailable while a stat, evaluation or group-by field is named "${SEVERITY_COLUMN}".`,
    ];
  }

  const [condition] = alertConditions;
  if (severity.mode === 'multi' && !isMultiSeveritySupported(condition.comparator)) {
    return ['Multi severity does not support the between or not_between comparators.'];
  }

  const severityError = getSeverityValidationError(severity, condition);
  return severityError ? [SEVERITY_VALIDATION_MESSAGES[severityError]] : [];
};

/**
 * Returns why the threshold builder can't generate a rule from these values,
 * or an empty list when it can.
 */
export const getThresholdValidationErrors = (values: ThresholdFormValues): string[] => {
  const errors: string[] = [];

  if (!values.indexPattern.trim()) {
    errors.push('An index pattern is required.');
  }

  if (!areAllStatsValid(values.stats)) {
    errors.push(
      'At least one stat is required. Every stat needs a label, and every aggregation other than count needs a field.'
    );
  }

  const availableLabels = getAvailableMetricLabels(values.stats, values.evaluations);
  for (const { label, expression } of values.evaluations) {
    const invalidReferences = getInvalidExpressionReferences(expression, availableLabels);
    if (invalidReferences.length > 0) {
      errors.push(
        `Evaluation "${label}" references unknown metrics: ${invalidReferences.join(', ')}.`
      );
    }
  }

  const hasValidCondition = values.alertConditions.some(
    ({ metric, threshold }) => metric.trim() && threshold.length > 0
  );
  if (!hasValidCondition) {
    errors.push('At least one alert condition needs a metric and a threshold.');
  }

  errors.push(...getSeverityErrors(values));

  if (values.recovery) {
    const hasValidRecovery = values.recovery.conditions.some(
      ({ metric, threshold }) => metric.trim() && threshold.length > 0
    );
    if (!hasValidRecovery) {
      errors.push('At least one recovery condition needs a metric and a threshold.');
    }
  }

  return errors;
};
