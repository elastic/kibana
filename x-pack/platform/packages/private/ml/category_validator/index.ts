/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export { categorizationExamplesProvider } from './src/examples';
export type {
  CategorizationAnalyzer,
  CategoryFieldExample,
  FieldExampleCheck,
  Token,
  FieldValidationResults,
} from './common/types/categories';
export {
  CATEGORY_EXAMPLES_ERROR_LIMIT,
  CATEGORY_EXAMPLES_SAMPLE_SIZE,
  CATEGORY_EXAMPLES_VALIDATION_STATUS,
  CATEGORY_EXAMPLES_WARNING_LIMIT,
  MEDIAN_LINE_LENGTH_LIMIT,
  NULL_COUNT_PERCENT_LIMIT,
  VALID_TOKEN_COUNT,
  VALIDATION_CHECK_DESCRIPTION,
  VALIDATION_RESULT,
} from './common/constants/categorization';
