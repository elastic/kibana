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
 * Enum ACTION
 * @export
 * @enum {number}
 */
export enum ACTION {
  SKIP_MODEL_UPDATE = 'skip_model_update',
  SKIP_RESULT = 'skip_result',
}

/**
 * Enum FILTER_TYPE
 * @export
 * @enum {number}
 */
export enum FILTER_TYPE {
  EXCLUDE = 'exclude',
  INCLUDE = 'include',
}

/**
 * Enum APPLIES_TO
 * @export
 * @enum {number}
 */
export enum APPLIES_TO {
  ACTUAL = 'actual',
  DIFF_FROM_TYPICAL = 'diff_from_typical',
  TYPICAL = 'typical',
}

/**
 * Enum OPERATOR
 * @export
 * @enum {number}
 */
export enum OPERATOR {
  LESS_THAN = 'lt',
  LESS_THAN_OR_EQUAL = 'lte',
  GREATER_THAN = 'gt',
  GREATER_THAN_OR_EQUAL = 'gte',
}

/**
 * List of detector functions which don't support rules with numeric conditions.
 */
export const CONDITIONS_NOT_SUPPORTED_FUNCTIONS = ['freq_rare', 'lat_long', 'metric', 'rare'];
