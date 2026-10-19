/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

const DEFAULT_WARNING_THRESHOLD_RATIO = 0.95;
const DEFAULT_INPUT_MAX_LENGTH_MULTIPLIER = 2;

export interface TextInputValidation {
  error?: string;
  warning?: string;
  valid: boolean;
}

export interface ValidateTextInputParams {
  value: string;
  maxLength: number;
  warningThresholdRatio?: number;
}

/** Hard ceiling for a textarea's `maxLength`, above the real limit so users can see the error. */
export const getTextInputHardMaxLength = (
  maxLength: number,
  multiplier = DEFAULT_INPUT_MAX_LENGTH_MULTIPLIER
): number => maxLength * multiplier;

export const validateTextInput = ({
  value,
  maxLength,
  warningThresholdRatio = DEFAULT_WARNING_THRESHOLD_RATIO,
}: ValidateTextInputParams): TextInputValidation => {
  const { length } = value;

  if (length > maxLength) {
    const charsOver = length - maxLength;
    return {
      error: i18n.translate('xpack.contextEngine.textInput.error.tooLong', {
        defaultMessage:
          '{charsOver, number} {charsOver, plural, one {character} other {characters}} over the {maxLength, number} character limit.',
        values: { charsOver, maxLength },
      }),
      valid: false,
    };
  }

  if (length > maxLength * warningThresholdRatio) {
    const charsRemaining = maxLength - length;
    return {
      warning: i18n.translate('xpack.contextEngine.textInput.warning.approachingLimit', {
        defaultMessage:
          '{charsRemaining, number} {charsRemaining, plural, one {character} other {characters}} remaining.',
        values: { charsRemaining },
      }),
      valid: true,
    };
  }

  return { valid: true };
};
