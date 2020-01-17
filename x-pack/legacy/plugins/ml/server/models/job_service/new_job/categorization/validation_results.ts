/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { i18n } from '@kbn/i18n';
import {
  CATEGORY_EXAMPLES_VALID_STATUS,
  CATEGORY_EXAMPLES_ERROR_LIMIT,
  CATEGORY_EXAMPLES_WARNING_LIMIT,
} from '../../../../../common/constants/new_job';
import {
  FieldExampleCheck,
  CategoryFieldExample,
  VALIDATION_RESULT,
} from '../../../../../common/types/categories';
import { getMedianStringLength } from '../../../../../common/util/string_utils';

const VALID_TOKEN_COUNT = 3;
const MEDIAN_LINE_LENGTH_LIMIT = 400;
const NULL_COUNT_PERCENT_LIMIT = 0.75;

export class ValidationResults {
  private _results: FieldExampleCheck[] = [];

  public get results() {
    return this._results;
  }

  public get overallResult() {
    if (this._results.some(c => c.valid === CATEGORY_EXAMPLES_VALID_STATUS.INVALID)) {
      return CATEGORY_EXAMPLES_VALID_STATUS.INVALID;
    }
    if (this._results.some(c => c.valid === CATEGORY_EXAMPLES_VALID_STATUS.PARTIALLY_VALID)) {
      return CATEGORY_EXAMPLES_VALID_STATUS.PARTIALLY_VALID;
    }
    return CATEGORY_EXAMPLES_VALID_STATUS.VALID;
  }

  private _resultExists(id: VALIDATION_RESULT) {
    return this._results.some(r => r.id === id);
  }

  public createTokenCountResult(sortedExamples: CategoryFieldExample[], sampleSize: number) {
    const validExamplesSize = sortedExamples.filter(e => e.tokens.length >= VALID_TOKEN_COUNT)
      .length;
    const percentValid = sampleSize === 0 ? 0 : validExamplesSize / sampleSize;

    let valid = CATEGORY_EXAMPLES_VALID_STATUS.VALID;
    if (percentValid < CATEGORY_EXAMPLES_ERROR_LIMIT) {
      valid = CATEGORY_EXAMPLES_VALID_STATUS.INVALID;
    } else if (percentValid < CATEGORY_EXAMPLES_WARNING_LIMIT) {
      valid = CATEGORY_EXAMPLES_VALID_STATUS.PARTIALLY_VALID;
    }

    const message = i18n.translate(
      'xpack.ml.models.jobService.categorization.messages.tokenLengthValidation',
      {
        defaultMessage:
          '{number} field {number, plural, zero {value} one {value} other {values}} analyzed, {percentage}% contain {validTokenCount} or more tokens.',
        values: {
          number: sampleSize,
          percentage: Math.floor(percentValid * 100),
          validTokenCount: VALID_TOKEN_COUNT,
        },
      }
    );

    if (
      this._resultExists(VALIDATION_RESULT.TOO_MANY_TOKENS) === false &&
      this._resultExists(VALIDATION_RESULT.FAILED_TO_TOKENIZE) === false
    ) {
      this._results.unshift({
        id: VALIDATION_RESULT.TOKEN_COUNT,
        valid,
        message,
      });
    }
  }

  public createMedianMessageLengthResult(examples: string[]) {
    const median = getMedianStringLength(examples);

    if (median > MEDIAN_LINE_LENGTH_LIMIT) {
      this._results.push({
        id: VALIDATION_RESULT.MEDIAN_LINE_LENGTH,
        valid: CATEGORY_EXAMPLES_VALID_STATUS.PARTIALLY_VALID,
        message: i18n.translate(
          'xpack.ml.models.jobService.categorization.messages.medianLineLength',
          {
            defaultMessage:
              'The median length for the field values analysed is over {medianLimit} characters.',
            values: { medianLimit: MEDIAN_LINE_LENGTH_LIMIT },
          }
        ),
      });
    }
  }

  public createNullValueResult(examples: Array<string | null | undefined>) {
    const nullCount = examples.filter(e => e === null).length;

    if (nullCount / examples.length >= NULL_COUNT_PERCENT_LIMIT) {
      this._results.push({
        id: VALIDATION_RESULT.NULL_VALUES,
        valid: CATEGORY_EXAMPLES_VALID_STATUS.PARTIALLY_VALID,
        message: i18n.translate('xpack.ml.models.jobService.categorization.messages.nullValues', {
          defaultMessage: 'More than {percent}% of field values are null.',
          values: { percent: NULL_COUNT_PERCENT_LIMIT * 100 },
        }),
      });
    }
  }

  public createTooManyTokensResult(error: any, sampleSize: number) {
    // expecting error reason:
    // The number of tokens produced by calling _analyze has exceeded the allowed maximum of [10000].
    // This limit can be set by changing the [index.analyze.max_token_count] index level setting.

    const reason: string = error?.body?.error?.reason;
    if (reason) {
      const rxp = /exceeded the allowed maximum of \[(\d+?)\]/;
      const match = rxp.exec(reason);
      if (match?.length === 2) {
        const tokenLimit = match[1];
        this._results.push({
          id: VALIDATION_RESULT.TOO_MANY_TOKENS,
          valid: CATEGORY_EXAMPLES_VALID_STATUS.INVALID,
          message: i18n.translate(
            'xpack.ml.models.jobService.categorization.messages.tooManyTokens',
            {
              defaultMessage:
                'Tokenization of field value examples has failed due to more than {tokenLimit} tokens being found in a sample of {sampleSize} values.',
              values: { sampleSize, tokenLimit },
            }
          ),
        });
        return;
      }
      return;
    }
    this.createFailureToTokenize(reason);
  }

  public createFailureToTokenize(reason: string | undefined) {
    this._results.push({
      id: VALIDATION_RESULT.FAILED_TO_TOKENIZE,
      valid: CATEGORY_EXAMPLES_VALID_STATUS.INVALID,
      message: i18n.translate(
        'xpack.ml.models.jobService.categorization.messages.failureToGetTokens',
        {
          defaultMessage:
            'It was not possible to tokenize a sample of example field values. {reason}',
          values: { reason: reason || '' },
        }
      ),
    });
  }
}
