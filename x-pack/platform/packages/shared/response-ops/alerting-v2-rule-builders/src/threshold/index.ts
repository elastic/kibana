/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export {
  Aggregation,
  Comparator,
  AGGREGATIONS_REQUIRING_FIELD,
  type ConditionOperator,
  type ThresholdStat,
  type ThresholdEvaluation,
  type ThresholdCondition,
  type ThresholdRecovery,
  type ThresholdBuilderFields,
} from './types';

export {
  MAX_CONDITIONS,
  MAX_EVALUATIONS,
  MAX_EXPRESSION_LENGTH,
  MAX_INDEX_PATTERN_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_STATS,
} from './constants';

export { thresholdBuilderFieldsSchema } from './schema';
export { generateThresholdQuery } from './generate_query';
export { thresholdBuilderTypeDefinition, THRESHOLD_BUILDER_TYPE } from './definition';
