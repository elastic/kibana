/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type {
  BuilderTypeDefinition,
  RegisteredBuilderType,
  OpaqueBuilderFields,
  GeneratedQuery,
} from './types';
export { defineBuilderType } from './types';

export { BuilderQueryGenerationError } from './errors';
export { BUILTIN_BUILDER_TYPES } from './builtin';

export {
  AGGREGATIONS_REQUIRING_FIELD,
  Aggregation,
  Comparator,
  generateThresholdQuery,
  thresholdBuilderFieldsSchema,
  thresholdBuilderTypeDefinition,
  THRESHOLD_BUILDER_TYPE,
  MAX_CONDITIONS,
  MAX_EVALUATIONS,
  MAX_EXPRESSION_LENGTH,
  MAX_INDEX_PATTERN_LENGTH,
  MAX_LABEL_LENGTH,
  MAX_STATS,
} from './threshold';
export type {
  ConditionOperator,
  ThresholdBuilderFields,
  ThresholdCondition,
  ThresholdEvaluation,
  ThresholdRecovery,
  ThresholdStat,
} from './threshold';
