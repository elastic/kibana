/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/*
 * Contains values for ML job detector rules.
 */

/**
 * Enum ML_DETECTOR_RULE_ACTION
 */
export enum ML_DETECTOR_RULE_ACTION {
  SKIP_MODEL_UPDATE = 'skip_model_update',
  SKIP_RESULT = 'skip_result',
  FORCE_TIME_SHIFT = 'force_time_shift',
}

/**
 * Enum ML_DETECTOR_RULE_FILTER_TYPE
 */
export enum ML_DETECTOR_RULE_FILTER_TYPE {
  EXCLUDE = 'exclude',
  INCLUDE = 'include',
}

/**
 * Enum ML_DETECTOR_RULE_APPLIES_TO
 */
export enum ML_DETECTOR_RULE_APPLIES_TO {
  ACTUAL = 'actual',
  DIFF_FROM_TYPICAL = 'diff_from_typical',
  TYPICAL = 'typical',
}

/**
 * Enum ML_DETECTOR_RULE_OPERATOR
 */
export enum ML_DETECTOR_RULE_OPERATOR {
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
}

/**
 * Enum ML_DETECTOR_RULE_PARAMS
 */
export enum ML_DETECTOR_RULE_PARAMS {
  FORCE_TIME_SHIFT = 'force_time_shift',
}

/**
 * Enum ML_DETECTOR_RULE_PARAMS_FORCE_TIME_SHIFT
 */
export enum ML_DETECTOR_RULE_PARAMS_FORCE_TIME_SHIFT {
  TIME_SHIFT_AMOUNT = 'time_shift_amount',
}

/**
 * List of detector functions which don't support rules with numeric conditions.
 */
export const ML_DETECTOR_RULE_CONDITIONS_NOT_SUPPORTED_FUNCTIONS = [
  'freq_rare',
  'lat_long',
  'metric',
  'rare',
];
