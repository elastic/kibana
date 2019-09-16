/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */
import { i18n } from '@kbn/i18n';
import {
  ILLEGAL_CHARACTERS,
  CONTAINS_SPACES,
  validateIndexPattern as getIndexPatternErrors,
} from 'ui/index_patterns';
import { Template } from '../../../common/types';
import { TemplateValidation } from './types';
import { isStringEmpty, removeEmptyErrorFields, isValid } from './validation_helpers';

const validateIndexPattern = (indexPattern: string) => {
  if (indexPattern) {
    const errors = getIndexPatternErrors(indexPattern);

    if (errors[ILLEGAL_CHARACTERS]) {
      return i18n.translate('xpack.idxMgmt.templateValidation.indexPatternInvalidCharactersError', {
        defaultMessage:
          "'{indexPattern}' index pattern contains the invalid {characterListLength, plural, one {character} other {characters}} { characterList }.",
        values: {
          characterList: errors[ILLEGAL_CHARACTERS].join(' '),
          characterListLength: errors[ILLEGAL_CHARACTERS].length,
          indexPattern,
        },
      });
    }

    if (errors[CONTAINS_SPACES]) {
      return i18n.translate('xpack.idxMgmt.templateValidation.indexPatternSpacesError', {
        defaultMessage: "'{indexPattern}' index pattern contains spaces.",
        values: {
          indexPattern,
        },
      });
    }
  }
};

export const INVALID_NAME_CHARS = ['"', '*', '\\', ',', '?'];

const doesStringIncludeChar = (string: string, chars: string[]) => {
  const invalidChar = chars.find(char => string.includes(char)) || null;
  const containsChar = invalidChar !== null;

  return { containsChar, invalidChar };
};

export const validateLogistics = (template: Template): TemplateValidation => {
  const { name, indexPatterns } = template;

  const validation: TemplateValidation = {
    isValid: true,
    errors: {
      indexPatterns: [],
      name: [],
    },
  };

  // Name validation
  if (name !== undefined && isStringEmpty(name)) {
    validation.errors.name.push(
      i18n.translate('xpack.idxMgmt.templateValidation.templateNameRequiredError', {
        defaultMessage: 'A template name is required.',
      })
    );
  } else {
    if (name.includes(' ')) {
      validation.errors.name.push(
        i18n.translate('xpack.idxMgmt.templateValidation.templateNameSpacesError', {
          defaultMessage: 'Spaces are not allowed in a template name.',
        })
      );
    }

    if (name.startsWith('_')) {
      validation.errors.name.push(
        i18n.translate('xpack.idxMgmt.templateValidation.templateNameUnderscoreError', {
          defaultMessage: 'A template name must not start with an underscore.',
        })
      );
    }

    if (name.startsWith('.')) {
      validation.errors.name.push(
        i18n.translate('xpack.idxMgmt.templateValidation.templateNamePeriodError', {
          defaultMessage: 'A template name must not start with a period.',
        })
      );
    }

    const { containsChar, invalidChar } = doesStringIncludeChar(name, INVALID_NAME_CHARS);

    if (containsChar) {
      validation.errors.name = [
        i18n.translate('xpack.idxMgmt.templateValidation.templateNameInvalidaCharacterError', {
          defaultMessage: 'A template name must not contain the character "{invalidChar}"',
          values: { invalidChar },
        }),
      ];
    }
  }

  // Index patterns validation
  if (Array.isArray(indexPatterns) && indexPatterns.length === 0) {
    validation.errors.indexPatterns.push(
      i18n.translate('xpack.idxMgmt.templateValidation.indexPatternsRequiredError', {
        defaultMessage: 'At least one index pattern is required.',
      })
    );
  } else if (Array.isArray(indexPatterns) && indexPatterns.length) {
    indexPatterns.forEach(pattern => {
      const errorMsg = validateIndexPattern(pattern);
      if (errorMsg) {
        validation.errors.indexPatterns.push(errorMsg);
      }
    });
  }

  validation.errors = removeEmptyErrorFields(validation.errors);
  validation.isValid = isValid(validation.errors);

  return validation;
};
