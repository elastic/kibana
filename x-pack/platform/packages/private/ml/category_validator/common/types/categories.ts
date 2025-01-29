/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type * as estypes from '@elastic/elasticsearch/lib/api/typesWithBodyKey';

import type {
  CATEGORY_EXAMPLES_VALIDATION_STATUS,
  VALIDATION_RESULT,
} from '../constants/categorization';

/**
 * Token
 */
export interface Token {
  /**
   * The token string.
   */
  token: string;
  /**
   * The starting offset of the token.
   */
  start_offset: number;
  /**
   * The ending offset of the token.
   */
  end_offset: number;
  /**
   * The type of the token.
   */
  type: string;
  /**
   * The position of the token.
   */
  position: number;
}

/**
 * Categorization analyzer with additional properties.
 */
export type CategorizationAnalyzer = estypes.MlCategorizationAnalyzerDefinition & {
  /**
   * The analyzer used for categorization.
   */
  analyzer?: string;
};

/**
 * Field example for a category.
 */
export interface CategoryFieldExample {
  /**
   * The text of the field example.
   */
  text: string;
  /**
   * The tokens extracted from the field example.
   */
  tokens: Token[];
}

/**
 * Result of a field example check.
 */
export interface FieldExampleCheck {
  /**
   * The ID of the validation result.
   */
  id: VALIDATION_RESULT;
  /**
   * The validation status of the field example.
   */
  valid: CATEGORY_EXAMPLES_VALIDATION_STATUS;
  /**
   * The message associated with the validation result.
   */
  message: string;
}

/**
 * Validation results for a specific field.
 */
export interface FieldValidationResults {
  /**
   * An array of example objects representing category field examples.
   * @type {CategoryFieldExample[]}
   */
  examples?: CategoryFieldExample[];

  /**
   * The total number of examples used for validation.
   * @type {number}
   */
  sampleSize: number;

  /**
   * The overall validation status of the category examples.
   * @type {CATEGORY_EXAMPLES_VALIDATION_STATUS}
   */
  overallValidStatus: CATEGORY_EXAMPLES_VALIDATION_STATUS;

  /**
   * An array of validation checks performed on each example.
   * @type {FieldExampleCheck[]}
   */
  validationChecks: FieldExampleCheck[];
}
