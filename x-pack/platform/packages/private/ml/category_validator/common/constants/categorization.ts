/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/**
 * The number of category examples to use for analysis.
 */
export const CATEGORY_EXAMPLES_SAMPLE_SIZE = 1000;

/**
 * The warning limit for category examples. If the category examples validation falls below this limit, a warning is triggered.
 */
export const CATEGORY_EXAMPLES_WARNING_LIMIT = 0.75;

/**
 * The error limit for category examples. If the category examples validation falls below this limit, an error is triggered.
 */
export const CATEGORY_EXAMPLES_ERROR_LIMIT = 0.02;

/**
 * The valid token count for category examples.
 */
export const VALID_TOKEN_COUNT = 3;

/**
 * The limit for the median line length of category examples.
 */
export const MEDIAN_LINE_LENGTH_LIMIT = 400;

/**
 * The limit for the percentage of null values in category examples.
 */
export const NULL_COUNT_PERCENT_LIMIT = 0.75;

/**
 * Enum representing the validation status of category examples.
 */
export enum CATEGORY_EXAMPLES_VALIDATION_STATUS {
  VALID = 'valid',
  PARTIALLY_VALID = 'partially_valid',
  INVALID = 'invalid',
}

/**
 * Enum representing the validation results for field examples.
 */
export enum VALIDATION_RESULT {
  NO_EXAMPLES,
  FAILED_TO_TOKENIZE,
  TOO_MANY_TOKENS,
  TOKEN_COUNT,
  MEDIAN_LINE_LENGTH,
  NULL_VALUES,
  INSUFFICIENT_PRIVILEGES,
}

/**
 * Description for each validation result.
 */
export const VALIDATION_CHECK_DESCRIPTION = {
  /**
   * Examples were successfully loaded.
   */
  [VALIDATION_RESULT.NO_EXAMPLES]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validNoDataFound',
    {
      defaultMessage: 'Examples were successfully loaded.',
    }
  ) as string,
  /**
   * The loaded examples were tokenized successfully.
   */
  [VALIDATION_RESULT.FAILED_TO_TOKENIZE]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validFailureToGetTokens',
    {
      defaultMessage: 'The loaded examples were tokenized successfully.',
    }
  ) as string,
  /**
   * More than {tokenCount} tokens per example were found in over {percentage}% of the loaded examples.
   */
  [VALIDATION_RESULT.TOKEN_COUNT]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validTokenLength',
    {
      defaultMessage:
        'More than {tokenCount} tokens per example were found in over {percentage}% of the loaded examples.',
      values: {
        percentage: Math.floor(CATEGORY_EXAMPLES_WARNING_LIMIT * 100),
        tokenCount: VALID_TOKEN_COUNT,
      },
    }
  ) as string,
  /**
   * The median line length of the loaded examples was less than {medianCharCount} characters.
   */
  [VALIDATION_RESULT.MEDIAN_LINE_LENGTH]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validMedianLineLength',
    {
      defaultMessage:
        'The median line length of the loaded examples was less than {medianCharCount} characters.',
      values: {
        medianCharCount: MEDIAN_LINE_LENGTH_LIMIT,
      },
    }
  ) as string,
  /**
   * Less than {percentage}% of the loaded examples were null.
   */
  [VALIDATION_RESULT.NULL_VALUES]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validNullValues',
    {
      defaultMessage: 'Less than {percentage}% of the loaded examples were null.',
      values: {
        percentage: Math.floor(100 - NULL_COUNT_PERCENT_LIMIT * 100),
      },
    }
  ) as string,
  /**
   * Less than 10000 tokens were found in total in the loaded examples.
   */
  [VALIDATION_RESULT.TOO_MANY_TOKENS]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validTooManyTokens',
    {
      defaultMessage: 'Less than 10000 tokens were found in total in the loaded examples.',
    }
  ) as string,
  /**
   * The user has sufficient privileges to perform the checks.
   */
  [VALIDATION_RESULT.INSUFFICIENT_PRIVILEGES]: i18n.translate(
    'xpack.ml.models.jobService.categorization.messages.validUserPrivileges',
    {
      defaultMessage: 'The user has sufficient privileges to perform the checks.',
    }
  ) as string,
};
