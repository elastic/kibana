/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromKueryExpression } from '@kbn/es-query';
import type { KpiMetricIndex } from '../../../../common/constants';
import { getKpiField } from '../../../../common/constants';
import { isKpiExtendedKeywordField } from '../../../../common/utils/kpi_metrics';
import type {
  CustomKpiMetricConfiguration,
  KpiMetricAggregationType,
} from '../../../../common/types/domain';

const NUMERIC_AGGREGATIONS: readonly KpiMetricAggregationType[] = [
  'sum',
  'avg',
  'min',
  'max',
  'median',
];

const isGroupByField = (index: KpiMetricIndex, field: string): boolean =>
  getKpiField(index, field)?.type === 'keyword' ||
  (index === 'cases' && isKpiExtendedKeywordField(field));

const getKpiMetricGroupByError = ({
  index,
  aggregation,
  percent,
  threshold,
  groupBy,
}: Pick<
  CustomKpiMetricConfiguration,
  'index' | 'aggregation' | 'percent' | 'threshold' | 'groupBy'
>): string | undefined => {
  if (groupBy == null) {
    return;
  }

  if (!isGroupByField(index, groupBy.field)) {
    return `The breakdown needs a keyword field of the ${index} index. ${groupBy.field} is not allowed.`;
  }

  if (aggregation != null && aggregation.type !== 'count') {
    return 'A breakdown counts the documents. It cannot use an aggregation.';
  }

  if (percent === true) {
    return 'A breakdown cannot show a percent.';
  }

  if (threshold != null) {
    return 'A breakdown cannot have a threshold.';
  }
};

/**
 * Returns an error message when the date field, the aggregation field, or the breakdown is not allowed for the index and the aggregation type.
 */
export const getKpiMetricFieldError = ({
  index,
  aggregation,
  percent,
  dateField,
  threshold,
  groupBy,
}: Pick<
  CustomKpiMetricConfiguration,
  'index' | 'aggregation' | 'percent' | 'dateField' | 'threshold' | 'groupBy'
>): string | undefined => {
  if (dateField != null && index !== 'cases') {
    return `The date field ${dateField} is not allowed for the ${index} index.`;
  }

  const groupByError = getKpiMetricGroupByError({
    index,
    aggregation,
    percent,
    threshold,
    groupBy,
  });

  if (groupByError != null) {
    return groupByError;
  }

  const isCount = aggregation == null || aggregation.type === 'count';

  if (percent === true && !isCount) {
    return 'A percent metric counts the documents. It cannot use an aggregation.';
  }

  if (aggregation == null || aggregation.type === 'count') {
    return;
  }

  const { type, field } = aggregation;

  if (field == null) {
    return `The ${type} aggregation needs a field.`;
  }

  const entry = getKpiField(index, field);

  if (entry == null) {
    return `The field ${field} is not allowed for the ${index} index.`;
  }

  if (type === 'cardinality' && entry.type !== 'keyword') {
    return `The unique count needs a keyword field. ${field} is not a keyword field.`;
  }

  if (NUMERIC_AGGREGATIONS.includes(type) && entry.type !== 'numeric') {
    return `The ${type} aggregation needs a numeric field. ${field} is not a numeric field.`;
  }
};

/**
 * Returns an error message when the KQL query does not parse.
 */
export const getKpiMetricQueryError = (query: string): string | undefined => {
  if (query.trim() === '') {
    return;
  }

  try {
    fromKueryExpression(query);
  } catch (error) {
    return `The KQL query is not valid: ${error.message}`;
  }
};
