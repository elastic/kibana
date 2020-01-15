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
import { FieldExampleCheck } from '../../../../../common/types/categories';
import { getMedianStringLength } from '../../../../../common/util/string_utils';

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

  public createTokenCountResult(percentValid: number, sampleSize: number) {
    let valid = CATEGORY_EXAMPLES_VALID_STATUS.VALID;
    if (percentValid < CATEGORY_EXAMPLES_ERROR_LIMIT) {
      valid = CATEGORY_EXAMPLES_VALID_STATUS.INVALID;
    } else if (percentValid < CATEGORY_EXAMPLES_WARNING_LIMIT) {
      valid = CATEGORY_EXAMPLES_VALID_STATUS.PARTIALLY_VALID;
    }

    this._results.push({
      valid,
      message: i18n.translate(
        'xpack.ml.models.jobService.categorization.messages.tokenLengthValidation',
        {
          defaultMessage:
            '{number} field {number, plural, zero {value} one {value} other {values}} analyzed, {percentage}% contain valid tokens.',
          values: {
            number: sampleSize,
            percentage: Math.floor(percentValid * 100),
          },
        }
      ),
    });
  }

  public createMedianMessageLengthResult(examples: string[]) {
    const median = getMedianStringLength(examples);

    if (median > MEDIAN_LINE_LENGTH_LIMIT) {
      this._results.push({
        valid: CATEGORY_EXAMPLES_VALID_STATUS.PARTIALLY_VALID,
        message: i18n.translate(
          'xpack.ml.models.jobService.categorization.messages.medianLineLength',
          {
            defaultMessage:
              'The median length for the values analysed is over {medianLimit} characters.',
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
        valid: CATEGORY_EXAMPLES_VALID_STATUS.PARTIALLY_VALID,
        message: i18n.translate(
          'xpack.ml.models.jobService.categorization.messages.medianLineLength',
          {
            defaultMessage: 'More than {percent}% of values are null',
            values: { percent: NULL_COUNT_PERCENT_LIMIT * 100 },
          }
        ),
      });
    }
  }

  public createTooManyTokensResult(error: any, sampleSize: number) {
    // expecting error reason:
    // The number of tokens produced by calling _analyze has exceeded the allowed maximum of [10000]. This limit can be set by changing the [index.analyze.max_token_count] index level setting.

    const reason: string = error?.body?.error?.reason;
    if (reason) {
      const rxp = /exceeded the allowed maximum of \[(\d+?)\]/;
      const match = rxp.exec(reason);
      if (match?.length === 2) {
        const tokenLimit = match[1];
        this._results.push({
          valid: CATEGORY_EXAMPLES_VALID_STATUS.PARTIALLY_VALID,
          message: i18n.translate(
            'xpack.ml.models.jobService.categorization.messages.tooManyTokens',
            {
              defaultMessage:
                'In a sample of {sampleSize}, more than {tokenLimit} tokens were found.',
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
      valid: CATEGORY_EXAMPLES_VALID_STATUS.PARTIALLY_VALID,
      message: i18n.translate('xpack.ml.models.jobService.categorization.messages.tooManyTokens', {
        defaultMessage: 'It was not possible to tokenize a sample of field values. {reason}',
        values: { reason: reason || '' },
      }),
    });
  }
}
