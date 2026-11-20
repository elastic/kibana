/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const MAX_NAME_LENGTH = 255;

/** Elasticsearch limits index and data stream names to 255 bytes. */
export const MAX_INDEX_PATTERN_LENGTH = 255;

const NAME_FORMAT = /^[a-z0-9][a-z0-9_-]*$/;
const TARGET_SEPARATOR = /[\s,]/;

export interface ValidationError<Code extends string> {
  code: Code;
  message: string;
}

export type NameErrorCode = 'required' | 'tooLong' | 'invalidFormat';
export type NameError = ValidationError<NameErrorCode>;

export type IndexPatternErrorCode = 'required' | 'tooLong' | 'notSingleTarget';
export type IndexPatternError = ValidationError<IndexPatternErrorCode>;

// Translated on demand, since the server may load this module before translations are ready.
const NAME_MESSAGES: Readonly<Record<NameErrorCode, () => string>> = {
  required: () =>
    i18n.translate('xpack.searchBoost.validation.nameRequired', {
      defaultMessage: 'Enter a name.',
    }),
  tooLong: () =>
    i18n.translate('xpack.searchBoost.validation.nameTooLong', {
      defaultMessage: 'Use {max} characters or fewer.',
      values: { max: MAX_NAME_LENGTH },
    }),
  invalidFormat: () =>
    i18n.translate('xpack.searchBoost.validation.nameInvalidFormat', {
      defaultMessage:
        'Use lowercase letters, numbers, hyphens, and underscores, starting with a letter or number.',
    }),
};

const INDEX_PATTERN_MESSAGES: Readonly<Record<IndexPatternErrorCode, () => string>> = {
  required: () =>
    i18n.translate('xpack.searchBoost.validation.indexPatternRequired', {
      defaultMessage: 'Enter a pattern or name.',
    }),
  tooLong: () =>
    i18n.translate('xpack.searchBoost.validation.indexPatternTooLong', {
      defaultMessage: 'Use {max} characters or fewer.',
      values: { max: MAX_INDEX_PATTERN_LENGTH },
    }),
  notSingleTarget: () =>
    i18n.translate('xpack.searchBoost.validation.indexPatternNotSingleTarget', {
      defaultMessage: 'Enter one pattern or name, without commas or spaces.',
    }),
};

const nameError = (code: NameErrorCode): NameError => ({ code, message: NAME_MESSAGES[code]() });

const indexPatternError = (code: IndexPatternErrorCode): IndexPatternError => ({
  code,
  message: INDEX_PATTERN_MESSAGES[code](),
});

/** Checks the name of a new boost rule or profile. */
export const validateName = (name: string): NameError | undefined => {
  if (name.trim().length === 0) {
    return nameError('required');
  }
  if (name.length > MAX_NAME_LENGTH) {
    return nameError('tooLong');
  }
  return NAME_FORMAT.test(name) ? undefined : nameError('invalidFormat');
};

/** Checks that a boost rule targets one index or data stream name, or one pattern. */
export const validateIndexPattern = (indexPattern: string): IndexPatternError | undefined => {
  if (indexPattern.trim().length === 0) {
    return indexPatternError('required');
  }
  if (indexPattern.length > MAX_INDEX_PATTERN_LENGTH) {
    return indexPatternError('tooLong');
  }
  return TARGET_SEPARATOR.test(indexPattern) ? indexPatternError('notSingleTarget') : undefined;
};

/** Whether a boost rule priority is a whole number of 0 or more. */
export const isValidPriority = (priority: number): boolean =>
  Number.isSafeInteger(priority) && priority >= 0;
