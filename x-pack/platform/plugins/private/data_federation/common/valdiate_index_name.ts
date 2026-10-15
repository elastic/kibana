/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export type DataSourceNameValidationError =
  | 'must_be_lowercase'
  | 'contains_illegal_characters'
  | 'invalid_start_character'
  | 'too_long'
  | 'starts_with_dot';

export interface DataSourceNameValidationResult {
  error: DataSourceNameValidationError;
  message: string;
}

const getByteLength = (value: string): number => new TextEncoder().encode(value).length;

// Matches any disallowed character anywhere in the name.
// Disallowed: \ / * ? " < > | whitespace , # : and lone surrogate \uD800
const ILLEGAL_CHARACTERS_REGEX = /[\\/*?"<>|\s,#:]+/;

// Disallowed start characters: -, _, +
const ILLEGAL_START_REGEX = /^[-_+]/;

const getInvalidNameErrorMessage = (error: DataSourceNameValidationError): string => {
  switch (error) {
    case 'must_be_lowercase':
      return i18n.translate('xpack.dataFederation.errors.dataSourceNameMustBeLowercase', {
        defaultMessage: 'Name must be lowercase.',
      });
    case 'starts_with_dot':
      return i18n.translate('xpack.dataFederation.errors.dataSourceNameCannotStartWithDot', {
        defaultMessage: 'Name cannot start with a dot (.).',
      });
    case 'invalid_start_character':
      return i18n.translate(
        'xpack.dataFederation.errors.dataSourceNameCannotStartWithReservedCharacters',
        {
          defaultMessage: 'Name cannot start with -, _, or +.',
        }
      );
    case 'too_long':
      return i18n.translate('xpack.dataFederation.errors.dataSourceNameTooLong', {
        defaultMessage: 'Name cannot be longer than 255 bytes.',
      });
    case 'contains_illegal_characters':
    default:
      return i18n.translate('xpack.dataFederation.errors.dataSourceNameContainsIllegalCharacters', {
        defaultMessage:
          'Name cannot include \\\\, /, *, ?, ", <, >, |, : (colon), spaces, , (comma), or #.',
      });
  }
};

export const validateIndexNameRules = (name: string): DataSourceNameValidationResult | null => {
  if (name !== name.toLowerCase()) {
    const error: DataSourceNameValidationError = 'must_be_lowercase';
    return { error, message: getInvalidNameErrorMessage(error) };
  }

  if (name.startsWith('.')) {
    const error: DataSourceNameValidationError = 'starts_with_dot';
    return { error, message: getInvalidNameErrorMessage(error) };
  }

  if (ILLEGAL_START_REGEX.test(name)) {
    const error: DataSourceNameValidationError = 'invalid_start_character';
    return { error, message: getInvalidNameErrorMessage(error) };
  }

  if (ILLEGAL_CHARACTERS_REGEX.test(name)) {
    const error: DataSourceNameValidationError = 'contains_illegal_characters';
    return { error, message: getInvalidNameErrorMessage(error) };
  }

  if (getByteLength(name) > 255) {
    const error: DataSourceNameValidationError = 'too_long';
    return { error, message: getInvalidNameErrorMessage(error) };
  }

  return null;
};

export const isValidIndexName = (name: string): boolean => validateIndexNameRules(name) === null;
