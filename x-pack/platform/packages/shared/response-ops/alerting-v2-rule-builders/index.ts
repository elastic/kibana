/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export type { BuilderRuleSource, BuiltRuleParts, RuleBuilderType } from './src/types';
export { RULE_BUILDER_TYPES, getRuleBuilderType } from './src/registry';
export { splitQuery } from './src/split_query';
export type { SplitConfidence, SplitResult } from './src/split_query';
export { escapeField } from './src/shared/escape_esql_identifier';

export {
  Aggregation,
  Comparator,
  AGGREGATIONS_REQUIRING_FIELD,
  DEFAULT_ALERT_CONDITION,
  DEFAULT_RECOVERY_CONDITION,
  DEFAULT_SINGLE_SEVERITY_LEVEL,
  DEFAULT_STAT,
  DEFAULT_THRESHOLD_FORM_VALUES,
  MAX_SEVERITY_LEVELS,
  SEVERITY_COLUMN,
  areAllStatsValid,
  clearConditionsForRemovedMetric,
  compareSeverity,
  createDefaultSeverityConfig,
  deriveRecoveryConditions,
  deriveStatLabel,
  generateId,
  getAvailableMetricLabels,
  getReservedSeverityLabelSources,
  getSeverityValidationError,
  hasReservedSeverityLabel,
  isAscendingComparator,
  isMultiSeveritySupported,
  isSeveritySupported,
  isStatFieldValid,
  isStatLabelValid,
  mostSevereSeverity,
  nextEvalLabel,
  nextSeverityLevel,
  nextSeverityThreshold,
  nextStatLabel,
  reconcileAlertConditionMetrics,
  reconcileSeverity,
  shouldSyncConditionMetricOnLabelChange,
  sortLevelsBySeverity,
  syncConditionsForLabelChange,
} from './src/threshold/form_types';
export type {
  AlertCondition,
  ConditionOperator,
  EvaluationDefinition,
  RecoveryCondition,
  RecoveryConfig,
  ReservedSeverityLabelSource,
  SeverityConfig,
  SeverityLevel,
  SeverityMode,
  SeverityValidationError,
  StatDefinition,
  ThresholdFormValues,
} from './src/threshold/form_types';

export { thresholdParamsSchema } from './src/threshold/params_schema';
export type { ThresholdParams } from './src/threshold/params_schema';
export { toThresholdFormState, fromThresholdFormState } from './src/threshold/form_state';
export { buildThresholdEsql, buildRecoveryBlock } from './src/threshold/build_esql';
export {
  extractRecoveryBlock,
  parseDiscoverQueryForBuilder,
  parseRecoveryBlock,
  parseThresholdEsql,
} from './src/threshold/parse_esql';
export {
  getExpressionColumnReferences,
  getInvalidExpressionReferences,
} from './src/threshold/validate_metric_references';
export { getThresholdValidationErrors } from './src/threshold/validate';
export { THRESHOLD_BUILDER_TYPE, thresholdRuleBuilderType } from './src/threshold/definition';
