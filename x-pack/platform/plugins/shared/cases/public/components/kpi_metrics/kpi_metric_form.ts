/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KpiFieldType, KpiMetricIndex } from '../../../common/constants';
import {
  DEFAULT_KPI_BREAKDOWN_SIZE,
  KPI_FIELD_CATALOG,
  MAX_KPI_BREAKDOWN_SIZE,
  MAX_METRIC_LABEL_LENGTH,
  MAX_METRIC_QUERY_LENGTH,
  PREDEFINED_KPI_METRIC_IDS,
  getKpiField,
  getPredefinedKpiMetric,
} from '../../../common/constants';
import type { KpiMetricRequest } from '../../../common/types/api';
import { isKpiExtendedKeywordField } from '../../../common/utils/kpi_metrics';
import type {
  KpiMetricAggregationType,
  KpiMetricDateField,
  KpiMetricDirection,
  KpiMetricThreshold,
  KpiMetricThresholdUnit,
} from '../../../common/types/domain';
import * as i18n from './translations';

export type ThresholdComparatorOption = 'none' | 'above' | 'below';
export type DirectionOption = 'none' | KpiMetricDirection;

export interface KpiMetricFormState {
  kind: 'predefined' | 'custom';
  predefinedId: string;
  label: string;
  index: KpiMetricIndex;
  dateField: KpiMetricDateField;
  query: string;
  aggregationType: KpiMetricAggregationType;
  field: string;
  percent: boolean;
  thresholdComparator: ThresholdComparatorOption;
  /**
   * The threshold in the selected unit for a duration metric, otherwise the raw value
   */
  thresholdValue: string;
  thresholdUnit: KpiMetricThresholdUnit;
  direction: DirectionOption;
  /**
   * The breakdown field of a count. An empty string means no grouping.
   */
  groupByField: string;
  groupBySize: string;
}

export interface KpiMetricFormErrors {
  label?: string;
  query?: string;
  field?: string;
  thresholdValue?: string;
  groupByField?: string;
  groupBySize?: string;
}

/**
 * Returns the keyword catalog fields of the index, the fields that a breakdown can group by.
 */
export const getGroupByFieldOptions = (index: KpiMetricIndex): string[] =>
  KPI_FIELD_CATALOG[index].filter(({ type }) => type === 'keyword').map(({ field }) => field);

export const isBreakdownMetric = (state: KpiMetricFormState): boolean =>
  state.kind === 'custom' && state.aggregationType === 'count' && state.groupByField !== '';

const isGroupByFieldAllowed = ({ index, groupByField }: KpiMetricFormState): boolean =>
  getGroupByFieldOptions(index).includes(groupByField) ||
  (index === 'cases' && isKpiExtendedKeywordField(groupByField));

const toGroupBySize = (value: string): number | undefined => {
  const size = Number(value);

  return value.trim() !== '' &&
    Number.isInteger(size) &&
    size >= 1 &&
    size <= MAX_KPI_BREAKDOWN_SIZE
    ? size
    : undefined;
};

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

const isDurationField = (state: KpiMetricFormState): boolean =>
  state.kind === 'custom' &&
  state.aggregationType !== 'count' &&
  state.aggregationType !== 'cardinality' &&
  getKpiField(state.index, state.field)?.unit === 's';

export const isDurationMetric = (state: KpiMetricFormState): boolean =>
  state.kind === 'predefined'
    ? getPredefinedKpiMetric(state.predefinedId)?.format === 'duration'
    : isDurationField(state);

const DEFAULT_THRESHOLD_UNIT: KpiMetricThresholdUnit = 'h';

const SECONDS_PER_THRESHOLD_UNIT: Record<KpiMetricThresholdUnit, number> = {
  m: 60,
  h: 3600,
  d: 86400,
};

const THRESHOLD_UNITS_LARGEST_FIRST: readonly KpiMetricThresholdUnit[] = ['d', 'h', 'm'];

const toThresholdSeconds = (value: number, unit: KpiMetricThresholdUnit): number =>
  Math.round(value * SECONDS_PER_THRESHOLD_UNIT[unit]);

const fromThresholdSeconds = (seconds: number, unit: KpiMetricThresholdUnit): number =>
  seconds / SECONDS_PER_THRESHOLD_UNIT[unit];

/**
 * Returns the largest unit that shows the seconds as a whole number, or minutes when no unit does.
 */
const getThresholdUnitForSeconds = (seconds: number): KpiMetricThresholdUnit =>
  THRESHOLD_UNITS_LARGEST_FIRST.find((unit) =>
    Number.isInteger(fromThresholdSeconds(seconds, unit))
  ) ?? 'm';

const withThreshold = (
  state: KpiMetricFormState,
  threshold?: KpiMetricThreshold
): KpiMetricFormState => {
  if (threshold == null) {
    return state;
  }

  if (!isDurationMetric(state)) {
    return { ...state, thresholdValue: String(threshold.value) };
  }

  const thresholdUnit = threshold.unit ?? getThresholdUnitForSeconds(threshold.value);

  return {
    ...state,
    thresholdUnit,
    thresholdValue: String(fromThresholdSeconds(threshold.value, thresholdUnit)),
  };
};

export const toKpiMetricFormState = (metric?: KpiMetricRequest | null): KpiMetricFormState => {
  const base: KpiMetricFormState = {
    kind: 'custom',
    predefinedId: PREDEFINED_KPI_METRIC_IDS[0],
    label: '',
    index: 'cases',
    dateField: 'created_at',
    query: '',
    aggregationType: 'count',
    field: '',
    percent: false,
    thresholdComparator: metric?.threshold?.comparator ?? 'none',
    thresholdValue: '',
    thresholdUnit: DEFAULT_THRESHOLD_UNIT,
    direction: metric?.direction ?? 'none',
    groupByField: '',
    groupBySize: String(DEFAULT_KPI_BREAKDOWN_SIZE),
  };

  if (metric == null) {
    return base;
  }

  if (metric.kind === 'predefined') {
    return withThreshold(
      { ...base, kind: 'predefined', predefinedId: metric.predefinedId },
      metric.threshold
    );
  }

  return withThreshold(
    {
      ...base,
      label: metric.label,
      index: metric.index,
      dateField: metric.dateField ?? 'created_at',
      query: metric.query,
      aggregationType: metric.aggregation?.type ?? 'count',
      field: metric.aggregation?.field ?? '',
      percent: metric.percent ?? false,
      groupByField: metric.groupBy?.field ?? '',
      groupBySize: String(metric.groupBy?.size ?? DEFAULT_KPI_BREAKDOWN_SIZE),
    },
    metric.threshold
  );
};

const validateGroupBy = (state: KpiMetricFormState): KpiMetricFormErrors => ({
  ...(!isGroupByFieldAllowed(state) && { groupByField: i18n.GROUP_BY_FIELD_ERROR }),
  ...(toGroupBySize(state.groupBySize) == null && { groupBySize: i18n.GROUP_BY_SIZE_ERROR }),
});

export const validateKpiMetricForm = (state: KpiMetricFormState): KpiMetricFormErrors => {
  const isBreakdown = isBreakdownMetric(state);
  const errors: KpiMetricFormErrors = isBreakdown ? validateGroupBy(state) : {};

  if (state.thresholdComparator !== 'none' && !isBreakdown) {
    const thresholdValue = parseFloat(state.thresholdValue);

    if (!Number.isFinite(thresholdValue)) {
      errors.thresholdValue = i18n.THRESHOLD_VALUE;
    } else if (thresholdValue < 0 && isDurationMetric(state)) {
      errors.thresholdValue = i18n.THRESHOLD_VALUE_NON_NEGATIVE;
    }
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

const toThreshold = (state: KpiMetricFormState): KpiMetricThreshold | undefined => {
  if (state.thresholdComparator === 'none') {
    return;
  }

  const value = parseFloat(state.thresholdValue);

  if (!isDurationMetric(state)) {
    return { comparator: state.thresholdComparator, value };
  }

  return {
    comparator: state.thresholdComparator,
    value: toThresholdSeconds(value, state.thresholdUnit),
    unit: state.thresholdUnit,
  };
};

/**
 * Builds the request metric from the form. Keeps the id and the display of an edited metric.
 * A breakdown has no percent and no threshold.
 */
export const toKpiMetricRequest = (
  state: KpiMetricFormState,
  existing?: KpiMetricRequest | null
): KpiMetricRequest => {
  const isBreakdown = isBreakdownMetric(state);
  const threshold = isBreakdown ? undefined : toThreshold(state);
  const base = {
    ...(existing?.id != null && { id: existing.id }),
    display: existing?.display ?? ('value' as const),
    ...(threshold != null && { threshold }),
    ...(state.direction !== 'none' && { direction: state.direction }),
  };

  if (state.kind === 'predefined') {
    return { ...base, kind: 'predefined', predefinedId: state.predefinedId };
  }

  return {
    ...base,
    ...(isBreakdown && {
      groupBy: {
        field: state.groupByField,
        size: toGroupBySize(state.groupBySize) ?? DEFAULT_KPI_BREAKDOWN_SIZE,
      },
    }),
    kind: 'custom',
    label: state.label.trim(),
    index: state.index,
    ...(state.index === 'cases' &&
      state.dateField === 'closed_at' && { dateField: 'closed_at' as const }),
    query: state.query,
    ...(state.aggregationType !== 'count' && {
      aggregation: { type: state.aggregationType, field: state.field },
    }),
    ...(state.aggregationType === 'count' && state.percent && !isBreakdown && { percent: true }),
  };
};
