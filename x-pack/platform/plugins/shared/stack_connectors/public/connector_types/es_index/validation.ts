/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ERROR_CODE } from '@kbn/es-ui-shared-plugin/static/forms/helpers/field_validators/types';
import type { ValidationFunc } from '@kbn/es-ui-shared-plugin/static/forms/hook_form_lib';
import { i18n } from '@kbn/i18n';

const INVALID_PREFIX = /^[-_+]/;
const INVALID_CHARS = /[# , :]/;

export const indexNameValidator =
  () =>
  (...args: Parameters<ValidationFunc>): ReturnType<ValidationFunc<any, ERROR_CODE>> => {
    const [{ value }] = args;

    if (typeof value !== 'string') {
      return;
    }

    const invalidPrefixMatch = value.match(INVALID_PREFIX);
    const invalidCharMatch = value.match(INVALID_CHARS);

    if (value !== value.toLowerCase()) {
      return {
        code: 'ERR_LOWERCASE_STRING',
        formatType: 'INDEX_PATTERN',
        message: i18n.translate('xpack.stackConnectors.components.index.validation.lowercase', {
          defaultMessage: 'The index pattern must be lowercase.',
        }),
      };
    }

    if (value.includes('*')) {
      return {
        code: 'ERR_INVALID_CHARS',
        formatType: 'INDEX_PATTERN',
        message: i18n.translate('xpack.stackConnectors.components.index.validation.wildcards', {
          defaultMessage: 'The index pattern cannot contain wildcards (*).',
        }),
      };
    }

    if (invalidCharMatch) {
      return {
        code: 'ERR_INVALID_CHARS',
        formatType: 'INDEX_PATTERN',
        message: i18n.translate(
          'xpack.stackConnectors.components.index.validation.invalidCharacter',
          {
            defaultMessage: 'The index pattern contains the invalid character {char}.',
            values: { char: invalidCharMatch[0] },
          }
        ),
      };
    }

    if (invalidPrefixMatch) {
      const invalidChar = invalidPrefixMatch[0];
      return {
        code: 'ERR_FIELD_FORMAT',
        formatType: 'INDEX_PATTERN',
        message: i18n.translate('xpack.stackConnectors.components.index.validation.invalidPrefix', {
          defaultMessage: 'The index pattern cannot start with {char}.',
          values: { char: invalidChar },
        }),
      };
    }

    if (value === '.' || value === '..') {
      return {
        code: 'ERR_FIELD_FORMAT',
        formatType: 'INDEX_PATTERN',
        message: i18n.translate('xpack.stackConnectors.components.index.validation.dotNames', {
          defaultMessage: 'The index pattern cannot be {value}',
          values: { value },
        }),
      };
    }

    if (new TextEncoder().encode(value).length > 255) {
      return {
        code: 'ERR_MAX_LENGTH',
        formatType: 'INDEX_PATTERN',
        message: i18n.translate('xpack.stackConnectors.components.index.validation.maxLength', {
          defaultMessage: 'The index pattern cannot be longer than 255.',
        }),
      };
    }
  };
