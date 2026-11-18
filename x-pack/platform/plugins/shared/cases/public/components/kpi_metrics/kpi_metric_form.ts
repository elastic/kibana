/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiFieldType, KpiMetricIndex } from '../../../common/constants';
import {
  KPI_FIELD_CATALOG,
  MAX_METRIC_LABEL_LENGTH,
  MAX_METRIC_QUERY_LENGTH,
  PREDEFINED_KPI_METRIC_IDS,
  getKpiField,
} from '../../../common/constants';
import type { KpiMetricRequest } from '../../../common/types/api';
import type { KpiMetricAggregationType } from '../../../common/types/domain';
import * as i18n from './translations';

export type ThresholdComparatorOption = 'none' | 'above' | 'below';

export interface KpiMetricFormState {
  kind: 'predefined' | 'custom';
  predefinedId: string;
  label: string;
  index: KpiMetricIndex;
  query: string;
  aggregationType: KpiMetricAggregationType;
  field: string;
  thresholdComparator: ThresholdComparatorOption;
  thresholdValue: string;
}

export interface KpiMetricFormErrors {
  label?: string;
  query?: string;
  field?: string;
  thresholdValue?: string;
}

export const getFieldTypeForAggregation = (
  aggregationType: KpiMetricAggregationType
): KpiFieldType | undefined => {
  if (aggregationType === 'count') {
    return;
  }

  return aggregationType === 'cardinality' ? 'keyword' : 'numeric';
};

export const getFieldOptions = (
  index: KpiMetricIndex,
  aggregationType: KpiMetricAggregationType
): string[] => {
  const fieldType = getFieldTypeForAggregation(aggregationType);

  return KPI_FIELD_CATALOG[index]
    .filter(({ type }) => type === fieldType)
    .map(({ field }) => field);
};

export const toKpiMetricFormState = (metric?: KpiMetricRequest | null): KpiMetricFormState => {
  const thresholdComparator = metric?.threshold?.comparator ?? 'none';
  const thresholdValue = metric?.threshold != null ? String(metric.threshold.value) : '';
  const base: KpiMetricFormState = {
    kind: 'custom',
    predefinedId: PREDEFINED_KPI_METRIC_IDS[0],
    label: '',
    index: 'cases',
    query: '',
    aggregationType: 'count',
    field: '',
    thresholdComparator,
    thresholdValue,
  };

  if (metric == null) {
    return base;
  }

  if (metric.kind === 'predefined') {
    return { ...base, kind: 'predefined', predefinedId: metric.predefinedId };
  }

  return {
    ...base,
    label: metric.label,
    index: metric.index,
    query: metric.query,
    aggregationType: metric.aggregation?.type ?? 'count',
    field: metric.aggregation?.field ?? '',
  };
};

export const validateKpiMetricForm = (state: KpiMetricFormState): KpiMetricFormErrors => {
  const errors: KpiMetricFormErrors = {};

  if (state.thresholdComparator !== 'none' && !Number.isFinite(parseFloat(state.thresholdValue))) {
    errors.thresholdValue = i18n.THRESHOLD_VALUE;
  }

  if (state.kind === 'predefined') {
    return errors;
  }

  if (state.label.trim() === '') {
    errors.label = i18n.REQUIRED_LABEL;
  } else if (state.label.length > MAX_METRIC_LABEL_LENGTH) {
    errors.label = i18n.MAX_LENGTH_ERROR(MAX_METRIC_LABEL_LENGTH);
  }

  if (state.query.length > MAX_METRIC_QUERY_LENGTH) {
    errors.query = i18n.MAX_LENGTH_ERROR(MAX_METRIC_QUERY_LENGTH);
  }

  if (
    state.aggregationType !== 'count' &&
    !getFieldOptions(state.index, state.aggregationType).includes(state.field)
  ) {
    errors.field = i18n.REQUIRED_FIELD;
  }

  return errors;
};

export const isDurationField = (state: KpiMetricFormState): boolean =>
  state.kind === 'custom' &&
  state.aggregationType !== 'count' &&
  state.aggregationType !== 'cardinality' &&
  getKpiField(state.index, state.field)?.unit === 's';

/**
 * Builds the request metric from the form. Keeps the id, the display, and the fields that the form
 * does not edit of an edited metric.
 */
export const toKpiMetricRequest = (
  state: KpiMetricFormState,
  existing?: KpiMetricRequest | null
): KpiMetricRequest => {
  const threshold =
    state.thresholdComparator === 'none'
      ? undefined
      : { comparator: state.thresholdComparator, value: parseFloat(state.thresholdValue) };
  const base = {
    ...(existing?.id != null && { id: existing.id }),
    display: existing?.display ?? ('value' as const),
    ...(threshold != null && { threshold }),
    ...(existing?.direction != null && { direction: existing.direction }),
  };

  if (state.kind === 'predefined') {
    return { ...base, kind: 'predefined', predefinedId: state.predefinedId };
  }

  const existingCustom = existing?.kind === 'custom' ? existing : undefined;

  return {
    ...base,
    ...(existingCustom?.percent != null && { percent: existingCustom.percent }),
    ...(existingCustom?.groupBy != null && { groupBy: existingCustom.groupBy }),
    kind: 'custom',
    label: state.label.trim(),
    index: state.index,
    query: state.query,
    ...(state.aggregationType !== 'count' && {
      aggregation: { type: state.aggregationType, field: state.field },
    }),
  };
};
